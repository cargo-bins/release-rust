import {addPath} from '@actions/core';
import {
	downloadTool,
	extractTar,
	extractZip,
	cacheDir
} from '@actions/tool-cache';
import {info} from 'console';
import {readFile} from 'fs/promises';
import {checkData} from 'ssri';

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

// TODO: change to version that supports cosign!
const BINSTALL_BOOTSTRAP_VERSION = '0.19.1';
const BINSTALL_BOOTSTRAP_PACKAGE = {
	Linux: {
		url: `https://github.com/cargo-bins/cargo-binstall/releases/download/v${BINSTALL_BOOTSTRAP_VERSION}/cargo-binstall-x86_64-unknown-linux-musl.tgz`,
		sri: 'sha512-mdzgZg3JM2AvjU+pX12RCm5g+Spew+LBDVB36fQIQg81Ozgmy5AXlxksBBcBV/bgAMrJkv6qU4n/IDCJHrG+5A=='
	},
	macOS: {
		url: `https://github.com/cargo-bins/cargo-binstall/releases/download/v${BINSTALL_BOOTSTRAP_VERSION}/cargo-binstall-x86_64-apple-darwin.zip`,
		sri: 'sha512-VqgewgdYu2nT1QT9P50JXdn7AI8nhNb8oebFibdjUt2MpSmFtBbr19oK09+sZGWSamX60VujxLK5vkxz8n0xHg=='
	},
	Windows: {
		url: `https://github.com/cargo-bins/cargo-binstall/releases/download/v${BINSTALL_BOOTSTRAP_VERSION}/cargo-binstall-x86_64-pc-windows-msvc.zip`,
		sri: 'sha512-k1s9UW6Zb20llIuopUwbf3D38OP1F+Nkgf3wGWwsXPwoQfhuiR89+VF3Rrf7YF20fN3tG4/3jZSC3apiHbQ6NA=='
	}
};

async function binstall(inputs: InputsType): Promise<void> {
	const pkg =
		BINSTALL_BOOTSTRAP_PACKAGE[
			(process.env.RUNNER_OS ??
				'') as keyof typeof BINSTALL_BOOTSTRAP_PACKAGE
		];
	if (!pkg) {
		throw new Error(`Unsupported platform: ${process.env.RUNNER_OS}`);
	}

	const arcPath = await downloadTool(pkg.url);
	checkData(await readFile(arcPath), pkg.sri, {error: true});
	const folder = await (arcPath.endsWith('.zip')
		? extractZip(arcPath)
		: extractTar(arcPath));
	const path = await cacheDir(
		folder,
		'cargo-binstall',
		BINSTALL_BOOTSTRAP_VERSION
	);
	addPath(path);

	if (inputs.setup.binstallVersion !== BINSTALL_BOOTSTRAP_VERSION) {
		info(`Installing cargo-binstall@${inputs.setup.binstallVersion}...`);
		execAndSucceed('cargo', [
			'binstall',
			'-y',
			'--no-symlinks',
			'--install-path',
			path,
			'--force',
			inputs.setup.binstallVersion
				? `cargo-binstall@${inputs.setup.binstallVersion}`
				: 'cargo-binstall'
		]);
	} else {
		info(
			`staying with bootstrapped cargo-binstall@${inputs.setup.binstallVersion}`
		);
	}
}

async function cross(inputs: InputsType): Promise<void> {
	// TODO
}

async function cosign(inputs: InputsType): Promise<void> {
	// TODO
}
