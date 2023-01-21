import { info } from '@actions/core';
import {execAndSucceed} from '../common/exec';

export async function cargoPublish(crate: string): Promise<void> {
	info(`Publishing ${crate}`);
	await execAndSucceed('cargo', [
		'publish',
		'--package',
		crate
	]);
}
