import {
	execAndSucceed,
	execAndSucceedWithOutput,
	runHook
} from '../common/exec';
import {InputsType} from '../schemata/index';
import {CargoPackage} from '../cargo/metadata';
import {renderTemplate} from '../common/template';
import {debug, info} from '@actions/core';

export default async function tagPhase(
	inputs: InputsType,
	release: CargoPackage,
	crates: CargoPackage[]
): Promise<void> {
	if (inputs.tag.enabled) {
		info('Fetch and create tags as needed');
		await execAndSucceed('git', ['fetch', '--tags']);

		if (!inputs.publish.allCrates && !inputs.release.separately) {
			await tagTheThing(inputs, release, release);
		} else {
			for (const crate of crates) {
				await tagTheThing(inputs, crate, release);
			}

			if (!crates.some(crate => crate.name === release.name)) {
				// if the release-crate is not within the set of published crates
				await tagTheThing(inputs, release, release);
			}
		}

		info('Push tags');
		await execAndSucceed('git', ['push', '--tags']);
	}

	await runHook(inputs, 'post-tag');
}

async function tagTheThing(
	inputs: InputsType,
	crate: CargoPackage,
	release: CargoPackage
): Promise<void> {
	debug(`Rendering tag for ${crate.name}`);
	const tagName = renderTemplate(inputs.tag.name ?? crate.version, {
		target: inputs.setup.target,
		'crate-name': crate.name,
		'crate-version': crate.version,
		'release-name': release.name,
		'release-version': release.version
	});

	const tagMessage =
		crate.name === release.name
			? `${crate.name} ${crate.version}`
			: `${crate.name} ${crate.version} (release ${release.version})`;

	const tags = await execAndSucceedWithOutput('git', ['tag', '-l']);
	if (tags.stdout.split('\n').includes(tagName)) {
		debug(`Tag ${tagName} already exists, skipping`);
		return;
	}

	info(`Tagging ${crate.name} as ${tagName} with message "${tagMessage}"`);
	await execAndSucceed('git', [
		'tag',
		'-a',
		tagName,
		'-m',
		tagMessage,
		...(inputs.tag.sign ? ['-s'] : [])
	]);
}
