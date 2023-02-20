import {getOctokit} from '@actions/github';
import {object, string} from 'yup';

import {getInput} from './common';

const SCHEMA = object({
	github: string().required(),
	crates: string().optional()
}).noUnknown();

export interface Credentials {
	githubToken: string;
	cratesToken?: string;
	github: ReturnType<typeof getOctokit>;
}

export async function getCredentials(): Promise<Credentials> {
	const inputs = await SCHEMA.validate({
		github: getInput('github-token', {required: true}),
		crates: getInput('crates-token')
	});

	return {
		githubToken: inputs.github,
		cratesToken: inputs.crates,
		github: getOctokit(inputs.github)
	};
}
