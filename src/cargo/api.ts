import {debug} from '@actions/core';
import {CratesIO} from 'crates.io';

const cratesIO = new CratesIO();

export async function isVersionPublished(
	packageName: string,
	version: string
): Promise<boolean> {
	try {
		debug(`Looking up ${packageName} ${version} on crates.io`);
		await cratesIO.api.crates.getVersion(packageName, version);
		debug(`Found ${packageName} ${version} on crates.io`);
		return true;
	} catch (error) {
		debug(`Response from crates.io: ${error}`);
		debug(
			`Assuming we did not find ${packageName} ${version} on crates.io`
		);
		return false;
	}
}
