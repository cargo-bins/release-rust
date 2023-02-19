import {object, boolean} from 'yup';

import {getInput} from './common';

const SCHEMA = object({
	crate: boolean().default(true).required(),
	crateOnly: boolean().default(false).required(),
	allCrates: boolean().default(false).required()
}).noUnknown();

export interface Publish {
	crate: boolean;
	crateOnly: boolean;
	allCrates: boolean;
}

export async function getPublish(): Promise<Publish> {
	return await SCHEMA.validate({
		crate: getInput('publish-crate'),
		crateOnly: getInput('publish-crate-only'),
		allCrates: getInput('publish-all-crates')
	});
}
