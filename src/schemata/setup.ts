import {getInput} from '@actions/core';
import {satisfies} from 'semver';
import {object, string} from 'yup';

import {Toolchain} from '../common/toolchain';

const SCHEMA = object({
	toolchain: string()
		.matches(/^(stable|nightly|1[.]\d+[.]\d+|nightly-\d+-\d+-\d+)$/)
		.default('nightly')
		.required(),
	target: string(),
	binstallVersion: string(),
	cosignVersion: string(),
	rekorVersion: string(),
	gitsignVersion: string(),
	crossVersion: string()
}).noUnknown();

export interface Setup {
	toolchain: Toolchain;
	target: string;
	binstallVersion?: string;
	cosignVersion?: string;
	rekorVersion?: string;
	gitsignVersion?: string;
	crossVersion?: string;
}

export function runnerHostTarget(): string {
	switch (process.env.RUNNER_OS) {
		case 'Linux':
			return 'x86_64-unknown-linux-gnu';
		case 'macOS':
			return 'x86_64-apple-darwin';
		case 'Windows':
			return 'x86_64-pc-windows-msvc';
		default:
			throw new Error(`Unsupported runner OS: ${process.env.RUNNER_OS}`);
	}
}

export async function getSetup(): Promise<Setup> {
	const inputs = await SCHEMA.validate({
		toolchain: getInput('toolchain'),
		target: getInput('target'),
		binstallVersion: getInput('binstall-version'),
		cosignVersion: getInput('cosign-version'),
		rekorVersion: getInput('rekor-version'),
		gitsignVersion: getInput('gitsign-version'),
		crossVersion: getInput('cross-version')
	});

	if (inputs.binstallVersion && !satisfies(inputs.binstallVersion, '>=0.20.0')) {
		throw new Error('binstall-version must be >=0.20.0');
	}

	if (inputs.cosignVersion && !satisfies(inputs.cosignVersion, '>=1.13.0')) {
		throw new Error('cosign-version must be >=1.13.0');
	}

	if (inputs.rekorVersion && !satisfies(inputs.rekorVersion, '>=1.0.0')) {
		throw new Error('rekor-version must be >=1.0.0');
	}

	if (inputs.gitsignVersion && !satisfies(inputs.gitsignVersion, '>=0.4.0')) {
		throw new Error('gitsign-version must be >=1.0.0');
	}

	if (inputs.crossVersion && !satisfies(inputs.crossVersion, '>=0.2.0')) {
		throw new Error('cross-version must be >=0.2.0');
	}

	return {
		...inputs,
		toolchain: inputs.toolchain as Toolchain,
		target: inputs.target ?? runnerHostTarget()
	};
}
