// eslint-disable @typescript-eslint/no-non-null-assertion
import {access, constants, readFile} from 'node:fs/promises';
import {basename, join} from 'node:path';
import {debug, error, info, isDebug, warning} from '@actions/core';
import {getOctokit} from '@actions/github';
import {Minimatch} from 'minimatch';

import {Pattern, PatternMap} from '../schemata/common';
import {PatternList} from '../common/pattern-list';
import {runHook} from '../common/exec';
import {glob} from '../common/glob';
import {InputsType} from '../schemata/index';
import {CargoPackage} from '../cargo/metadata';
import {renderTemplate} from '../common/template';
import {TaggedRelease} from './tag';
import {CrateManifest} from './package';

export default async function releasePhase(
	inputs: InputsType,
	release: CargoPackage,
	tags: TaggedRelease[]
): Promise<void> {
	if (inputs.release.enabled) {
		const manifestPath = join(inputs.package.output, '.crates.json');
		debug(`Reading ${manifestPath}`);
		const manifests = JSON.parse(
			await readFile(manifestPath, 'utf-8')
		) as CrateManifest[];

		if (inputs.release.separately) {
			for (const tag of tags) {
				info(`Releasing tag ${tag.tagName}`);
				const releaseId = await ensureReleaseExists(
					inputs,
					tag,
					release
				);

				const manifest = manifests.find(
					({name}) => name === tag.crate.name
				);
				const files = new Set(
					(manifest?.packageFiles ?? []).map(file =>
						join(inputs.package.output, file)
					)
				);

				await uploadAssets(inputs, releaseId, files);
			}
		} else {
			const tag = tags.find(tag => tag.crate.name === release.name);
			if (!tag) {
				throw new Error('No tag for release');
			}

			const releaseId = await ensureReleaseExists(inputs, tag, release);

			const files = new Set(
				(await glob(join(inputs.package.output, '*'))).concat(
					(manifests[0]?.packageFiles ?? []).map(file =>
						join(inputs.package.output, file)
					)
				)
			);

			await uploadAssets(inputs, releaseId, files);
		}
	}

	await runHook(inputs, 'post-release');
}

function patternPrecision(pattern: Pattern): number {
	const specials = pattern
		.split('')
		.filter(char => ['?', '*', '{', '}'].includes(char)).length;
	return 1 - specials / pattern.length;
}

function mapPatternFor(map: PatternMap, crateName: string): string | null {
	const ordered = Object.entries(map).sort(
		([a], [b]) => patternPrecision(b) - patternPrecision(a)
	);

	for (const [pattern, template] of ordered) {
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

async function ensureReleaseExists(
	inputs: InputsType,
	tag: TaggedRelease,
	release: CargoPackage
): Promise<number> {
	const extantRelease = await releaseId(
		inputs.credentials.github,
		tag.tagName
	);
	if (extantRelease) {
		info(`Release ${tag.tagName} already exists (ID=${extantRelease})`);
		return extantRelease;
	} else {
		debug(`Figuring out release details for ${tag.tagName}`);

		const vars = {
			target: inputs.setup.target,
			'crate-name': tag.crate.name,
			'crate-version': tag.crate.version,
			'release-name': release.name,
			'release-version': release.version,
			'release-tag': tag.tagName
		};
		const releaseName = renderTemplate(
			mapPatternFor(inputs.release.name, tag.crate.name) ??
				'{crate-version}',
			vars
		);
		const releaseBody = renderTemplate(
			mapPatternFor(inputs.release.notes, tag.crate.name) ?? '',
			{...vars, 'release-name': releaseName}
		);
		const markLatest = isLatest(inputs.release.latest, tag.crate.name);
		const markPre = isPre(inputs.release.pre, tag.crate.name);

		try {
			const newRelease = await createRelease(
				inputs.credentials.github,
				tag.tagName,
				releaseName,
				releaseBody,
				markPre,
				markLatest
			);
			info(`Created release ${tag.tagName} (ID=${newRelease})`);
			return newRelease;
		} catch (err) {
			debug(
				'Creating failed, checking if release was created while we were trying'
			);
			const extantRelease = await releaseId(
				inputs.credentials.github,
				tag.tagName
			);
			if (extantRelease) {
				info(
					`Release ${tag.tagName} already exists (ID=${extantRelease})`
				);
				return extantRelease;
			}

			error(`Failed to create release ${tag.tagName}: ${err}`);
			throw err;
		}
	}
}

async function releaseId(
	github: ReturnType<typeof getOctokit>,
	tag: string
): Promise<number | null> {
	const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/');

	try {
		debug(`Checking if release ${tag} exists`);
		const {data, status} = await github.rest.repos.getReleaseByTag({
			owner,
			repo,
			tag
		});

		if (status !== 200) {
			return null;
		}

		return data.id;
	} catch (err: unknown) {
		return null;
	}
}

async function createRelease(
	github: ReturnType<typeof getOctokit>,
	tag: string,
	name: string,
	body: string,
	prerelease: boolean,
	latest: boolean
): Promise<number> {
	const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/');

	debug(
		`Creating release ${tag}: ${JSON.stringify({
			name,
			body,
			prerelease,
			latest
		})}`
	);
	const {data, status} = await github.rest.repos.createRelease({
		owner,
		repo,
		tag_name: tag,
		name,
		body,
		draft: false,
		prerelease,
		make_latest: latest
	});

	if (status !== 201) {
		throw new Error(
			`Failed to create release ${tag}: ${JSON.stringify(data)}`
		);
	}

	return data.id;
}

async function fileExists(file: string): Promise<boolean> {
	try {
		await access(file, constants.R_OK);
		return true;
	} catch (_: unknown) {
		return false;
	}
}

async function uploadAssets(
	inputs: InputsType,
	releaseId: number,
	files: Set<string>
): Promise<void> {
	const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/');

	info(`Uploading ${files.size} assets to release ${releaseId}`);
	let uploaded = 0;
	for (const file of files) {
		if (!(await fileExists(file))) {
			warning(
				`Asset ${file} does not exist (or cannot be read), skipping`
			);
			continue;
		}

		for (const attempt of [1, 2, 3]) {
			try {
				if (attempt > 1) {
					info(`Retrying upload of ${file} (attempt ${attempt})`);
				} else {
					info(`Uploading ${file}`);
				}

				await inputs.credentials.github.rest.repos.uploadReleaseAsset({
					owner,
					repo,
					release_id: releaseId,
					name: basename(file),
					data: `@${file}`
				});

				uploaded += 1;
				info(`Uploaded ${file}`);
				break;
			} catch (err: unknown) {
				if (attempt < 3) {
					const delay = 10 + Math.ceil(Math.random() * 200);
					warning(
						`Failed to upload ${file}: ${err}, retrying after ${delay}ms`
					);
					await new Promise(resolve => setTimeout(resolve, delay));
				} else {
					error(`Failed to upload ${file}: ${err}, skipping`);
				}
			}
		}
	}
	info(`Uploaded ${uploaded}/${files.size} assets to release ${releaseId}`);
}
