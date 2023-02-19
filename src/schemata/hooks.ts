import {object, string} from 'yup';

import {getInput} from './common';

const SCHEMA = object({
	postSetup: string(),
	postPublish: string(),
	customBuild: string(),
	postBuild: string(),
	prePackage: string(),
	postPackage: string(),
	postSign: string(),
	postRelease: string(),
	shell: string().default('bash').required()
}).noUnknown();

export interface Hooks {
	postSetup?: string;
	postPublish?: string;
	customBuild?: string;
	postBuild?: string;
	prePackage?: string;
	postPackage?: string;
	postSign?: string;
	postRelease?: string;
	shell: string;
}

export async function getHooks(): Promise<Hooks> {
	return await SCHEMA.validate({
		postSetup: getInput('post-setup'),
		postPublish: getInput('post-publish'),
		customBuild: getInput('custom-build'),
		postBuild: getInput('post-build'),
		prePackage: getInput('pre-package'),
		postPackage: getInput('post-package'),
		postSign: getInput('post-sign'),
		postRelease: getInput('post-release'),
		shell: getInput('shell')
	});
}
