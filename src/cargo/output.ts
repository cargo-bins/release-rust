import { dirname } from 'node:path';
import { glob } from '../common/glob';

import {CargoPackageTarget} from './metadata';

export function parseOutput(output: string): CargoBuildMessage[] {
	return output
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(line => line.length)
		.map(line => JSON.parse(line) as CargoBuildMessage);
}

export type CargoBuildMessage =
	| CompilerMessage
	| ArtifactMessage
	| BuildScriptOutput
	| BuildFinished
	| OtherMessage;

export function isArtifactMessage(
	message: CargoBuildMessage
): message is ArtifactMessage {
	return message.reason === 'compiler-artifact';
}

export interface ArtifactMessage {
	reason: 'compiler-artifact';
	package_id: string;
	filenames: string[];
	executable: string | null;
	target: CargoPackageTarget;
}

export async function findDebugSymbols(filenames: string[]): Promise<void> {
	for (const filename in filenames) {
		const dir = dirname(filename);
		filenames.push(...await glob(`${dir}/@(*.dSYM|*.pdb|*.dwp)`));
	}
}

// don't care about these:

export interface CompilerMessage {
	reason: 'compiler-message';
}

export interface BuildScriptOutput {
	reason: 'build-script-executed';
}

export interface BuildFinished {
	reason: 'build-finished';
}

export interface OtherMessage {
	reason: string;
}
