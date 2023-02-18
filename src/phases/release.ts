import {runHook} from '../common/exec';
import {InputsType} from '../schemata/index';
import {CargoPackage} from '../cargo/metadata';
import {TaggedRelease} from './tag';
import {renderTemplate} from '../common/template';
import {Minimatch} from 'minimatch';
import {debug, isDebug, warning} from '@actions/core';
import {Pattern, PatternMap} from '../schemata/common';
import { PatternList } from '../common/pattern-list';

export default async function releasePhase(
	inputs: InputsType,
	release: CargoPackage,
	tags: TaggedRelease[]
): Promise<void> {
	if (inputs.release.enabled) {
		if (inputs.release.separately) {
			// TODO
		} else {
			const tag = tags.find(tag => tag.crate.name === release.name);
			if (!tag) {
				throw new Error('No tag for release');
			}

			const vars = {
				target: inputs.setup.target,
				'crate-name': release.name,
				'crate-version': release.version,
				'release-name': release.name,
				'release-version': release.version,
				'release-tag': tag.tagName
			};
			const releaseName = renderTemplate(
				mapPatternFor(inputs.release.name, release.name) ??
					'{crate-version}',
				vars
			);
			const releaseBody = renderTemplate(
				mapPatternFor(inputs.release.notes, release.name) ?? '',
				{...vars, 'release-name': releaseName}
			);
			const markLatest = isLatest(inputs.release.latest, release.name);
			const markPre = isPre(inputs.release.pre, release.name);
			// TODO: create release if not exists
			// TODO: upload assets
		}
	}

	await runHook(inputs, 'post-release');
}

function mapPatternFor(map: PatternMap, crateName: string): string | null {
	for (const [pattern, template] of Object.entries(map)) {
		if (
			new Minimatch(pattern, {
				debug: isDebug()
			}).match(crateName)
		) {
			debug(
				`Resolved template for ${crateName} to ${pattern}'s: "${template}"`
			);
			return template;
		}
	}

	warning(`No template found for crate ${crateName}, using default`);
	return null;
}

function isLatest(input: boolean | string, crateName: string): boolean {
	if (typeof input === 'string') {
		return input === crateName;
	}

	return input !== false;
}

function isPre(input: boolean | Pattern[], crateName: string): boolean {
	if (typeof input === 'boolean') {
		return input;
	}

	return new PatternList(input).matchOne(crateName);
}
