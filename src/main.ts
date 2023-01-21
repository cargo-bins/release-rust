import {setFailed, debug} from '@actions/core';

import getInputs from './schemata';
import * as phase from './phases';
import {buildStdEnabled} from './targets/build-std';

(async () => {
	try {
		const inputs = await getInputs();
		debug(`inputs: ${JSON.stringify(inputs)}`);

		const newBuildStd = buildStdEnabled(inputs);
		if (inputs.build.buildstd !== newBuildStd) {
			debug(
				`Given ${Object.entries({
					buildstd: inputs.build.buildstd,
					toolchain: inputs.setup.toolchain,
					target: inputs.setup.target
				})
					.map(([k, v]) => `${k}=${v}`)
					.join(',')}, overriding buildstd to ${newBuildStd}`
			);
			inputs.build.buildstd = newBuildStd;
		}

		debug('SETUP PHASE');
		await phase.setup(inputs);

		debug('PUBLISH PHASE');
		const crates = await phase.publish(inputs);

		if (inputs.publish.crateOnly) {
			debug('publish-crate-only is on, we are DONE!');
			return;
		}

		debug('BUILD PHASE');
		await phase.build(inputs, crates);

		debug('PACKAGE PHASE');
		await phase.package(inputs, crates);

		debug('SIGN PHASE');
		await phase.sign(inputs, crates);

		debug('TAG PHASE');
		await phase.tag(inputs, crates);

		debug('RELEASE PHASE');
		await phase.release(inputs, crates);

		debug('DONE');
		return;
	} catch (error: unknown) {
		if (error instanceof Error) setFailed(error.message);
		else if (typeof error === 'string') setFailed(error);
		else setFailed('An unknown error has occurred');
	}
})();
