"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const metadata_1 = require("../cargo/metadata");
const pattern_list_1 = require("../common/pattern-list");
const exec_1 = require("../common/exec");
const api_1 = require("../cargo/api");
const publish_1 = require("../cargo/publish");
async function publishPhase(inputs) {
    const cargoMeta = await (0, metadata_1.cargoMetadata)();
    const allLocalCrates = cargoMeta.packages.filter(p => p.source === null);
    (0, core_1.debug)(`Found ${allLocalCrates.length} local crates: ${allLocalCrates
        .map(p => p.name)
        .join(', ')}`);
    const cratesFilter = new pattern_list_1.PatternList(inputs.build.crates);
    let cratesToPackageAndRelease = cratesFilter.matchListBy(allLocalCrates, p => p.name);
    (0, core_1.debug)(`Filtered down to ${cratesToPackageAndRelease.length} crates to potentially package/release: ${cratesToPackageAndRelease
        .map(p => p.name)
        .join(', ')}`);
    let cratesToPublish = (inputs.publish.allCrates ? allLocalCrates : cratesToPackageAndRelease).filter(p => p.publish !== false);
    (0, core_1.debug)(`Potentially ${cratesToPublish.length} crates to publish: ${cratesToPublish.map(p => p.name).join(', ')}`);
    const cratesAlreadyPublished = (await Promise.all(cratesToPublish.map(async (pkg) => ({
        pkg,
        published: await (0, api_1.isVersionPublished)(pkg.name, pkg.version)
    }))))
        .filter(({ published }) => published)
        .map(({ pkg }) => pkg);
    (0, core_1.debug)(`${cratesAlreadyPublished.length} crates already published: ${cratesAlreadyPublished
        .map(p => p.name)
        .join(', ')}`);
    if (inputs.release.separately) {
        cratesToPackageAndRelease = cratesToPackageAndRelease.filter(p => !cratesToPublish.includes(p));
        (0, core_1.debug)(`Final list of crates to package/release: ${cratesToPackageAndRelease
            .map(p => p.name)
            .join(', ')}`);
    }
    cratesToPublish = cratesToPublish.filter(p => !cratesAlreadyPublished.includes(p));
    if (inputs.publish.crateOnly && cratesToPublish.length === 0) {
        throw new Error('No crates to publish and we are in crate-only mode');
    }
    (0, core_1.debug)(`Final list of crates to publish: ${cratesToPublish
        .map(p => p.name)
        .join(', ')}`);
    for (const crate of cratesToPublish) {
        await (0, publish_1.cargoPublish)(crate.name);
    }
    await (0, exec_1.runHook)(inputs, 'post-publish');
    return {
        released: cratesToPackageAndRelease,
        published: cratesToPublish,
        release: firstReleaseCrate(inputs, cratesToPackageAndRelease)
    };
}
exports.default = publishPhase;
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
function firstReleaseCrate(inputs, crates) {
    let name;
    if (inputs.build.crates.length === 1 && inputs.build.crates[0] === '*') {
        // That's the default; we can't really differentiate between it and an explicit set.
        // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
        name = crates
            .filter(c => c.targets.some(t => t.kind.includes('bin') || t.crate_types.includes('bin')))
            .map(c => c.name)
            .sort()[0];
    }
    else {
        const firstPattern = new pattern_list_1.PatternList([inputs.build.crates[0]]);
        name = firstPattern.matchListBy(crates, c => c.name)[0].name;
    }
    const crate = crates.find(c => c.name === name);
    if (!crate) {
        throw new Error('Could not find release crate: no binary crate?');
    }
    return crate;
}
