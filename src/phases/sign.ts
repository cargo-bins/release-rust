import {join} from 'node:path';
import {debug, error, info} from '@actions/core';
import {execAndSucceed, runHook} from '../common/exec';
import {glob} from '../common/glob';
import {InputsType} from '../schemata/index';
import {extraFlags} from '../common/flags';

export default async function signPhase(inputs: InputsType): Promise<void> {
	if (inputs.package.sign) {
		const outputs = await glob(join(inputs.package.output, '*'));
		info(`Found ${outputs.length} outputs to sign: ${outputs.join(', ')}`);
		for (const output of outputs) {
			try {
				await signOutput(inputs, output);
			} catch (err) {
				error(`Failed to sign ${output}: ${err}, skipping`);
			}
		}
	} else {
		info('Skipping signing');
	}

	await runHook(inputs, 'post-sign');
}

async function signOutput(inputs: InputsType, output: string): Promise<void> {
	info(`Signing ${output} with cosign`);
	await execAndSucceed(
		'cosign',
		[
			'sign-blob',
			'--yes',
			...extraFlags(inputs, 'cosignFlags', {
				OUTPUT: output
			}),
			output
		],
		{
			env: {
				COSIGN_EXPERIMENTAL: '1'
			}
		}
	);
}
