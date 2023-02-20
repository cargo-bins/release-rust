import {getOctokit} from '@actions/github';
import {expect, test, describe, beforeAll} from '@jest/globals';
import {join} from 'node:path';
import {cwd} from 'node:process';
import getInputs, {InputsType} from '../src/schemata';

async function parseInput(input: {
	[key: string]: string | boolean | number;
}): Promise<InputsType> {
	for (const [k, v] of Object.entries(input)) {
		process.env[`INPUT_${k.replace(/ /g, '_').toUpperCase()}`] =
			v.toString();
	}

	try {
		return await getInputs();
	} catch (err) {
		console.error(err);
		throw err;
	} finally {
		for (const k of Object.keys(input)) {
			delete process.env[`INPUT_${k.replace(/ /g, '_').toUpperCase()}`];
		}
	}
}

const TOKEN_GH_VALID = 'ghp_1234567890';
const TOKEN_CR_VALID = 'abcd1234567890';

const CREDENTIALS_INPUT = {
	'github-token': TOKEN_GH_VALID,
	'crates-token': TOKEN_CR_VALID
};

const ALL_DEFAULTS: InputsType = {
	credentials: {
		githubToken: TOKEN_GH_VALID,
		cratesToken: TOKEN_CR_VALID,
		github: expect.any(Object) as unknown as ReturnType<typeof getOctokit>
	},
	setup: {
		toolchain: 'nightly',
		target: 'x86_64-unknown-linux-gnu'
	},
	build: {
		crates: ['*'],
		features: [],
		buildstd: true,
		debuginfo: true,
		muslLibGcc: true
	},
	extras: {
		rustupComponents: [],
		cargoFlags: [],
		rustcFlags: [],
		cosignFlags: []
	},
	package: {
		archive: 'zip',
		files: [],
		name: '{release-name}-{target}',
		inDir: true,
		separately: false,
		shortExt: false,
		output: join(cwd(), 'packages/'),
		sign: true
	},
	publish: {
		crate: true,
		crateOnly: false,
		allCrates: false
	},
	tag: {
		enabled: true,
		crates: true,
		sign: true
	},
	release: {
		enabled: true,
		name: {'*': '{crate-version}'},
		notes: {'*': ''},
		separately: false,
		latest: true,
		pre: false
	},
	hooks: {
		shell: 'bash'
	}
};

beforeAll(() => {
	process.env.RUNNER_OS ??= 'Linux';
});

describe('credentials', () => {
	test('only tokens', () =>
		expect(
			parseInput({
				'github-token': TOKEN_GH_VALID,
				'crates-token': TOKEN_CR_VALID
			})
		).resolves.toMatchObject({...ALL_DEFAULTS}));

	test('no crates token', () =>
		expect(
			parseInput({
				'github-token': TOKEN_GH_VALID
			})
		).resolves.toMatchObject({
			...ALL_DEFAULTS,
			credentials: {
				githubToken: TOKEN_GH_VALID,
				github: expect.any(Object)
			}
		}));

	test('no github token', () =>
		expect(parseInput({})).rejects.toMatchObject({
			message: 'Input required and not supplied: github-token'
		}));
});
