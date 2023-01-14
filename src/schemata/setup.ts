import {getInput} from '@actions/core';
import {object, string} from 'yup';
import { Toolchain } from '../toolchain';

const SCHEMA = object({
	toolchain: string()
		.matches(/^(stable|nightly|1[.]\d+[.]\d+|nightly-\d+-\d+-\d+)$/)
		.default('nightly')
		.required(),
	target: string(),
	binstallVersion: string(),
	cosignVersion: string(),
	crossVersion: string(),
}).noUnknown();

export interface Setup {
	toolchain: Toolchain;
	target: string;
	binstallVersion?: string;
	cosignVersion?: string;
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
		crossVersion: getInput('cross-version'),
	});

	return {
		...inputs,
		toolchain: inputs.toolchain as Toolchain,
		target: inputs.target ?? runnerHostTarget(),
	};
}
