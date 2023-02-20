import {array, boolean, object, string} from 'yup';

import {getInput, newlineList, Pattern} from './common';

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
	crtStatic: boolean(),
	useCross: boolean()
}).noUnknown();

export interface Build {
	crates: Pattern[];
	features: string[];
	buildstd: boolean;
	debuginfo: boolean;
	muslLibGcc: boolean;
	crtStatic?: boolean;
	useCross?: boolean;
}

export async function getBuild(): Promise<Build> {
	return await SCHEMA.validate({
		crates: getInput('crates'),
		features: getInput('features'),
		buildstd: getInput('buildstd'),
		debuginfo: getInput('debuginfo'),
		muslLibGcc: getInput('musl-libgcc'),
		crtStatic: getInput('crt-static'),
		useCross: getInput('use-cross')
	});
}
