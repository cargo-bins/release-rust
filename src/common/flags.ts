import {parse as shellParse} from 'shell-quote';
import {hookEnv} from '../common/exec';
import {Extras, InputsType} from '../schemata';

export function extraFlags(
	inputs: InputsType,
	name: keyof Extras,
	env: {[key: string]: string} = {}
): string[] {
	const extraFlags = shellParse(inputs.extras[name].join(' '), {
		...hookEnv(inputs),
		...env
	});

	if (extraFlags.some(flag => typeof flag !== 'string')) {
		throw new Error(`${name} cannot contain shell operators`);
	}

	return extraFlags as string[];
}
