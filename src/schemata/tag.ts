import {getInput} from '@actions/core';
import {object, boolean, string} from 'yup';

export const SCHEMA = object({
	name: string().min(1).default('false').required(),
	crates: boolean().default(true).required(),
	sign: boolean().default(true).required()
}).noUnknown();

export interface Tag {
	enabled: boolean;
	name?: string;
	crates: boolean;
	sign: boolean;
}

export async function getTag(): Promise<Tag> {
	const inputs = await SCHEMA.validate({
		name: getInput('tag'),
		crates: getInput('tag-crates'),
		sign: getInput('tag-sign')
	});

	const enabled = inputs.name !== 'false';
	return {
		enabled,
		name: inputs.name === 'false' ? undefined : inputs.name,
		crates: enabled && inputs.crates,
		sign: enabled && inputs.sign
	};
}
