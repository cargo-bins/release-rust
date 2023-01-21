import {debug} from '@actions/core';
import {cargoMetadata} from '../cargo/metadata';
import {PatternList} from '../common/pattern-list';
import {runHook} from '../common/exec';
import {InputsType} from '../schemata/index';
import {isVersionPublished} from '../cargo/api';
import { cargoPublish } from '../cargo/publish';

export default async function publishPhase(inputs: InputsType): Promise<void> {
	const cargoMeta = await cargoMetadata();
	const allLocalCrates = cargoMeta.packages.filter(p => p.source === null);
	debug(
		`Found ${allLocalCrates.length} local crates: ${allLocalCrates
			.map(p => p.name)
			.join(', ')}`
	);

	const cratesFilter = new PatternList(inputs.build.crates);
	let cratesToPackageAndRelease = cratesFilter.matchListBy(
		allLocalCrates,
		p => p.name
	);
	debug(
		`Filtered down to ${
			cratesToPackageAndRelease.length
		} crates to potentially package/release: ${cratesToPackageAndRelease
			.map(p => p.name)
			.join(', ')}`
	);

	let cratesToPublish = (
		inputs.publish.allCrates ? allLocalCrates : cratesToPackageAndRelease
	).filter(p => p.publish !== false);
	debug(
		`Potentially ${
			cratesToPublish.length
		} crates to publish: ${cratesToPublish.map(p => p.name).join(', ')}`
	);

	const cratesAlreadyPublished = (
		await Promise.all(
			cratesToPublish.map(async pkg => ({
				pkg,
				published: await isVersionPublished(pkg.name, pkg.version)
			}))
		)
	)
		.filter(({published}) => published)
		.map(({pkg}) => pkg);
	debug(
		`${
			cratesAlreadyPublished.length
		} crates already published: ${cratesAlreadyPublished
			.map(p => p.name)
			.join(', ')}`
	);

	if (inputs.release.separately) {
		cratesToPackageAndRelease = cratesToPackageAndRelease.filter(
			p => !cratesToPublish.includes(p)
		);
		debug(
			`Final list of crates to package/release: ${cratesToPackageAndRelease
				.map(p => p.name)
				.join(', ')}`
		);
	}

	cratesToPublish = cratesToPublish.filter(
		p => !cratesAlreadyPublished.includes(p)
	);

	if (inputs.publish.crateOnly && cratesToPublish.length === 0) {
		throw new Error('No crates to publish and we are in crate-only mode');
	}

	debug(
		`Final list of crates to publish: ${cratesToPublish
			.map(p => p.name)
			.join(', ')}`
	);

	for (const crate of cratesToPublish) {
		await cargoPublish(crate.name);
	}

	await runHook(inputs, 'post-publish');
}
