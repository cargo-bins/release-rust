import { debug } from '@actions/core';
import {cargoMetadata} from '../cargo/metadata';
import {runHook} from '../exec';
import {InputsType} from '../schemata/index';

export default async function publishPhase(inputs: InputsType): Promise<void> {
	const cargoMeta = await cargoMetadata();
	const allLocalPackages = cargoMeta.packages.filter(p => p.source === null);
	debug(`Found ${allLocalPackages.length} local packages: ${allLocalPackages.map(p => p.name).join(', ')}`);

	// TODO

	await runHook(inputs, 'post-publish');
}
