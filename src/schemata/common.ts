import {getInput as actionInput, InputOptions} from '@actions/core';

export function newlineList(str: string): string[] {
	return str
		.split('\n')
		.map(s => s.trim())
		.filter(s => s.length > 0 && !s.startsWith('#'));
}

export type Pattern = `*` | `!${string}` | string;
export type PatternMap = {[key: Pattern]: string};

// behaves more in line with what yup expects
export function getInput(
	name: string,
	options?: InputOptions
): string | undefined {
	const input = actionInput(name, options);
	if (input === '') return undefined;
	return input;
}
