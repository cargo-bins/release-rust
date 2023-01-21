import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {debug, info} from '@actions/core';
import {exec, ExecOptions} from '@actions/exec';

import {InputsType} from '../schemata/index';

export async function execAndSucceed(
	command: string,
	args: string[],
	options?: ExecOptions
): Promise<void> {
	info(`Running command: ${command} ${args.join(' ')}`);
	const exitCode = await exec(command, args, options);
	if (exitCode !== 0) {
		throw new Error(`Command failed with exit code ${exitCode}`);
	}
}

export async function execAndSucceedWithOutput(
	command: string,
	args: string[],
	options?: ExecOptions
): Promise<{ stdout: string; stderr: string; }> {
	info(`Running command (grabbing output): ${command} ${args.join(' ')}`);

	let stdout = '';
	let stderr = '';
	const exitCode = await exec(command, args, {
		...options,
		listeners: {
			stdout: (data: Buffer) => {
				stdout += data.toString();
			},
			stderr: (data: Buffer) => {
				stderr += data.toString();
			}
		}
	});

	if (exitCode !== 0) {
		debug(`=== Command output on STDOUT:\n${stdout}`);
		debug(`=== Command output on STDERR:\n${stderr}`);
		throw new Error(`Command failed with exit code ${exitCode}`);
	}

	return { stdout, stderr };
}

export async function runHook(
	inputs: InputsType,
	name: string,
	environment: {[key: string]: string} = {},
	workdir: string = process.cwd()
): Promise<void> {
	let hook;
	switch (name) {
		case 'post-setup':
			hook = inputs.hooks.postSetup;
			break;
		case 'post-publish':
			hook = inputs.hooks.postPublish;
			break;
		case 'custom-build':
			hook = inputs.hooks.customBuild;
			break;
		case 'post-build':
			hook = inputs.hooks.postBuild;
			break;
		case 'pre-package':
			hook = inputs.hooks.prePackage;
			break;
		case 'post-package':
			hook = inputs.hooks.postPackage;
			break;
		case 'post-sign':
			hook = inputs.hooks.postSign;
			break;
		case 'post-release':
			hook = inputs.hooks.postRelease;
			break;
		default:
			throw new Error(`Unknown hook: ${name}`);
	}

	if (!hook) {
		debug(`No ${name} hook defined, skipping`);
		return;
	}

	const env = {
		...process.env,
		RELEASE_ROOT: process.cwd(), // TODO: actually compute workspace root?
		RELEASE_PACKAGE_OUTPUT: inputs.package.output,
		RELEASE_TARGET: inputs.setup.target,
		...environment
	};

	debug('Creating temporary directory for hook script');
	const dir = await mkdtemp(join(tmpdir(), `${name}-`));

	let ext = 'sh';
	if (/^cmd/i.test(inputs.hooks.shell)) {
		ext = 'bat';
	} else if (/^(pwsh|powershell)/i.test(inputs.hooks.shell)) {
		ext = 'ps1';
	}

	const path = join(dir, `${name}.${ext}`);
	debug(`Writing ${name} hook to ${path}`);
	await writeFile(path, hook, {encoding: 'utf8'});

	debug(`Running ${name} hook`);
	if (ext === 'cmd') {
		await execAndSucceed('cmd', ['/c', `${path}`], {
			cwd: workdir,
			env
		});
	} else {
		const [prog, ...shellArgs] = inputs.hooks.shell.split(' ');
		if (ext === 'ps1') shellArgs.push('-file');
		await execAndSucceed(prog, [...shellArgs, `${path}`], {
			cwd: workdir,
			env
		});
	}
}
