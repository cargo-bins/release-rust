import {debug} from '@actions/core';
import {CargoPackage, cargoMetadata} from '../cargo/metadata';
import {PatternList} from '../common/pattern-list';
import {runHook} from '../common/exec';
import {InputsType} from '../schemata/index';
import {isVersionPublished} from '../cargo/api';
import {cargoPublish} from '../cargo/publish';

export default async function publishPhase(
	inputs: InputsType
): Promise<{crates: CargoPackage[]; release: CargoPackage}> {
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
	return {
		crates: cratesToPackageAndRelease,
		release: firstReleaseCrate(inputs, cratesToPackageAndRelease)
	};
}

// From README:
//
// When the action is run in a workspace, it will build and package all crates in the workspace by
// default, but it will use the "first" binary crate as the source for the names and versions of the
// release and package, and only publish that one to crates.io.
//
// That "first" crate is determined by sorting the names of all binary crates in the workspace in
// lexicographic order, and using the first one, or by the first entry in the crates input. If the
// first entry in the crates input is a glob pattern, the first lexicographic match in its expansion
// will be used. This is also called the release-name (e.g. in the package-name template).
function firstReleaseCrate(
	inputs: InputsType,
	crates: CargoPackage[]
): CargoPackage {
	let name: string;
	if (inputs.build.crates.length === 1 && inputs.build.crates[0] === '*') {
		// That's the default; we can't really differentiate between it and an explicit set.
		name = crates
			.filter(c =>
				c.targets.some(
					t => t.kind.includes('bin') || t.crate_types.includes('bin')
				)
			)
			.map(c => c.name)
			.sort()[0];
	} else {
		const firstPattern = new PatternList([inputs.build.crates[0]]);
		name = firstPattern.matchListBy(crates, c => c.name)[0].name;
	}

	const crate = crates.find(c => c.name === name);
	if (!crate) {
		throw new Error('Could not find release crate: no binary crate?');
	}

	return crate;
}
