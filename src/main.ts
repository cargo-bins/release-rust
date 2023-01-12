import {setFailed, debug} from '@actions/core';

import getInputs from './schema';

(async () => {
	try {
		const inputs = await getInputs();
		debug(`inputs: ${JSON.stringify(inputs)}`);
	} catch (error: unknown) {
		if (error instanceof Error) setFailed(error.message);
		else if (typeof error === 'string') setFailed(error);
		else setFailed('An unknown error has occurred');
	}
})();
