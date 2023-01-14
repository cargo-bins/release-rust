import {execAndSucceed, runHook} from '../exec';
import {InputsType} from '../schemata/index';

export default async function setupPhase(inputs: InputsType): Promise<void> {
	await rustup(inputs);
	await binstall(inputs);
	await cross(inputs);
	await cosign(inputs);

	await runHook(inputs, 'post-setup');
}

async function rustup(inputs: InputsType): Promise<void> {
	const components = new Set(inputs.extras.rustupComponents);
	if (inputs.build.buildstd) {
		components.add('rust-src');
	}

	await execAndSucceed('rustup', [
		'toolchain',
		'install',
		inputs.setup.toolchain,
		'--profile',
		'minimal',
		'--component',
		[...components].join(',')
	]);

	await execAndSucceed('rustup', [
		'target',
		'add',
		inputs.setup.target,
		'--toolchain',
		inputs.setup.toolchain
	]);

	await execAndSucceed('rustup', ['default', inputs.setup.toolchain]);
}

async function binstall(inputs: InputsType): Promise<void> {
	// TODO
}

async function cross(inputs: InputsType): Promise<void> {
	// TODO
}

async function cosign(inputs: InputsType): Promise<void> {
	// TODO
}
