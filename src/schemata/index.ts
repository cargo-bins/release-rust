import {debug} from '@actions/core';

export {Pattern} from './common';
import {Credentials, getCredentials} from './credentials';
import {Setup,  getSetup} from './setup';
import {Build, getBuild} from './build';
import {Extras, getExtras} from './extras';
import {Package, ArchiveFormat, getPackage} from './package';
import {Publish, getPublish} from './publish';
import {Tag, getTag} from './tag';
import {Release, getRelease} from './release';
import {Hooks, getHooks} from './hooks';

export {Credentials, Setup, Build, Extras, Package, ArchiveFormat, Publish, Tag, Release, Hooks};

export default async function getInputs(): Promise<InputsType> {
	debug('validating inputs');
	const inputs = {
		credentials: await getCredentials(),
		setup: await getSetup(),
		build: await getBuild(),
		extras: await getExtras(),
		package: await getPackage(),
		publish: await getPublish(),
		tag: await getTag(),
		release: await getRelease(),
		hooks: await getHooks(),
	};

	debug(`inputs: ${JSON.stringify(inputs)}`);
	return inputs;
}

export interface InputsType {
	credentials: Credentials;
	setup: Setup;
	build: Build;
	extras: Extras;
	package: Package;
	publish: Publish;
	tag: Tag;
	release: Release;
	hooks: Hooks;
}

