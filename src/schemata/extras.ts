import {array, object, string} from 'yup';

import {getInput} from './common';
import {newlineList} from './common';

const SCHEMA = object({
	rustupComponents: array()
		.of(string().min(1).required())
		.transform(newlineList)
		.default([])
		.required(),
	cargoFlags: array()
		.of(string().min(1).required())
		.transform(newlineList)
		.default([])
		.required(),
	rustcFlags: array()
		.of(string().min(1).required())
		.transform(newlineList)
		.default([])
		.required(),
	cosignFlags: array()
		.of(string().min(1).required())
		.transform(newlineList)
		.default([])
		.required()
}).noUnknown();

export interface Extras {
	rustupComponents: string[];
	cargoFlags: string[];
	rustcFlags: string[];
	cosignFlags: string[];
}

export async function getExtras(): Promise<Extras> {
	return await SCHEMA.validate({
		rustupComponents: getInput('extra-rustup-components'),
		cargoFlags: getInput('extra-cargo-flags'),
		rustcFlags: getInput('extra-rustc-flags'),
		cosignFlags: getInput('extra-cosign-flags')
	});
}
