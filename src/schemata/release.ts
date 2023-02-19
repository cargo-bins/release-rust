import {boolean, mixed, object} from 'yup';

import {Pattern, PatternMap, newlineList, getInput} from './common';

function isPatternMap(input: unknown): input is PatternMap {
	return (
		true &&
		typeof input === 'object' &&
		input !== null &&
		!Array.isArray(input) &&
		Object.values(input).every(value => typeof value === 'string')
	);
}

function detectPatternMap(input: string): PatternMap {
	try {
		const parsed = JSON.parse(input);
		if (isPatternMap(parsed)) {
			return parsed;
		}
	} catch (_) {
		// ignore
	}

	return {'*': input};
}

function isPatternListOrBoolean(input: unknown): input is Pattern[] | boolean {
	return (
		typeof input === 'boolean' ||
		(Array.isArray(input) &&
			input.every(value => typeof value === 'string'))
	);
}

function parsePatternListOrBoolean(input: string): Pattern[] | boolean {
	if (/true/i.test(input)) {
		return true;
	}

	if (/false/i.test(input)) {
		return false;
	}

	return newlineList(input);
}

function isStringOrBoolean(input: unknown): input is string | boolean {
	return typeof input === 'boolean' || typeof input === 'string';
}

function parseStringOrBoolean(input: string): string | boolean {
	if (/true/i.test(input)) {
		return true;
	}

	if (/false/i.test(input)) {
		return false;
	}

	return input;
}

const SCHEMA = object({
	enabled: boolean().default(true).required(),
	name: object()
		.transform(detectPatternMap)
		.default({'*': '{crate-version}'})
		.required(),
	notes: object().transform(detectPatternMap).default({'*': ''}).required(),
	separately: boolean().default(false).required(),
	latest: mixed(isStringOrBoolean)
		.transform(parseStringOrBoolean)
		.default(true)
		.required(),
	pre: mixed(isPatternListOrBoolean)
		.transform(parsePatternListOrBoolean)
		.default(false)
		.required()
}).noUnknown();

export interface Release {
	enabled: boolean;
	name: PatternMap;
	notes: PatternMap;
	separately: boolean;
	latest: boolean | string;
	pre: boolean | Pattern[];
}

export async function getRelease(): Promise<Release> {
	return await SCHEMA.validate({
		enabled: getInput('release'),
		name: getInput('release-name'),
		notes: getInput('release-notes'),
		separately: getInput('release-separately'),
		latest: getInput('release-latest'),
		pre: getInput('release-pre')
	});
}
