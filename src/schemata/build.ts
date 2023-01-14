import {getInput} from '@actions/core';
import {array, boolean, object, string} from 'yup';

import {newlineList, Pattern} from './common';

const SCHEMA = object({
	crates: array()
		.of(string().min(1).required())
		.transform(newlineList)
		.default(['*'])
		.min(1)
		.required(),
	features: array()
		.of(string().min(1).required())
		.transform(newlineList)
		.default([])
		.required(),
	buildstd: boolean().default(true).required(),
	debuginfo: boolean().default(true).required(),
	muslLibGcc: boolean().default(true).required(),
	useCross: boolean(),
}).noUnknown();

export interface Build {
	crates: Pattern[];
	features: string[];
	buildstd: boolean;
	debuginfo: boolean;
	muslLibGcc: boolean;
	useCross?: boolean;
}

export async function getBuild(): Promise<Build> {
	return await SCHEMA.validate({
		crates: getInput('crates'),
		features: getInput('features'),
		buildstd: getInput('buildstd'),
		debuginfo: getInput('debuginfo'),
		muslLibGcc: getInput('musl-libgcc'),
		useCross: getInput('use-cross'),
	});
}
