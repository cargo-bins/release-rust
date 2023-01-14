import { join } from 'node:path';

import {getInput} from '@actions/core';
import {array, boolean, object, string} from 'yup';

import {newlineList, Pattern} from './common';

const SCHEMA = object({
	archive: string()
		.oneOf(['none', 'zip', 'tar+gzip', 'tar-bzip2', 'tar+xz', 'tar+zstd'])
		.default('zip')
		.required(),
	files: array()
		.of(string().min(1).required())
		.transform(newlineList)
		.default([])
		.required(),
	name: string()
		.min(1)
		.when('separately', {
			is: true,
			then: schema => schema.default('{crate-name}-{target}'),
			otherwise: schema => schema.default('{release-name}-{target}'),
		})
		.required(),
	inDir: boolean().default(true).required(),
	separately: boolean().default(false).required(),
	shortExt: boolean().default(false).required(),
	output: string().default('packages/').required(),
	sign: boolean().default(true).required()
}).noUnknown();

export interface Package {
	archive: ArchiveFormat;
	files: Pattern[];
	name: string;
	inDir: boolean;
	separately: boolean;
	shortExt: boolean;
	output: string;
	sign: boolean;
}

export type ArchiveFormat = 'none' | 'zip' | 'tar+gzip' | 'tar-bzip2' | 'tar+xz' | `tar+zstd`;

export async function getPackage(): Promise<Package> {
	const inputs = await SCHEMA.validate({
		archive: getInput('package-archive'),
		files: getInput('package-files'),
		name: getInput('package-name'),
		inDir: getInput('package-in-dir'),
		separately: getInput('package-separately'),
		shortExt: getInput('package-short-ext'),
		output: getInput('package-output'),
		sign: getInput('package-sign')
	});

	return {
		...inputs,
		output: join(process.cwd(), inputs.output),
	};
}
