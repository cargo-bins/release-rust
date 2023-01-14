import {getInput} from '@actions/core';
import {object, string} from 'yup';

const SCHEMA = object({
	github: string().required(),
	crates: string().optional(),
}).noUnknown();

export interface Credentials {
	github: string;
	crates?: string;
}

export async function getCredentials(): Promise<Credentials> {
	return await SCHEMA.validate({
		github: getInput('github-token'),
		crates: getInput('crates-token'),
	});
}
