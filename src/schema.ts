import {debug, getInput} from '@actions/core';
import {object, string} from 'yup';

const SCHEMA = object({
	tokens: object({
		github: string().required()
	}).noUnknown()
}).noUnknown();

export default async function getInputs(): Promise<InputsType> {
	debug('validating inputs');
	const inputs = await SCHEMA.validate({
		tokens: {
			github: getInput('github-token')
		}
	});

	debug(`inputs: ${JSON.stringify(inputs)}`);
	return inputs;
}

export interface InputsType {
	tokens: TokensType;
}

export interface TokensType {
	github: string;
}
