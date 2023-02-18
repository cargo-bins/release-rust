"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exec_1 = require("../common/exec");
const template_1 = require("../common/template");
const core_1 = require("@actions/core");
async function tagPhase(inputs, release, crates) {
    const tags = [];
    if (inputs.tag.enabled) {
        (0, core_1.info)('Fetch and create tags as needed');
        await (0, exec_1.execAndSucceed)('git', ['fetch', '--tags']);
        if (!inputs.publish.allCrates && !inputs.release.separately) {
            tags.push(await tagTheThing(inputs, release, release));
        }
        else {
            for (const crate of crates) {
                tags.push(await tagTheThing(inputs, crate, release));
            }
            if (!crates.some(crate => crate.name === release.name)) {
                // if the release-crate is not within the set of published crates
                tags.push(await tagTheThing(inputs, release, release));
            }
        }
        (0, core_1.info)('Push tags');
        await (0, exec_1.execAndSucceed)('git', ['push', '--tags']);
    }
    await (0, exec_1.runHook)(inputs, 'post-tag');
    return tags;
}
exports.default = tagPhase;
async function tagTheThing(inputs, crate, release) {
    var _a;
    (0, core_1.debug)(`Rendering tag for ${crate.name}`);
    const tagName = (0, template_1.renderTemplate)((_a = inputs.tag.name) !== null && _a !== void 0 ? _a : crate.version, {
        target: inputs.setup.target,
        'crate-name': crate.name,
        'crate-version': crate.version,
        'release-name': release.name,
        'release-version': release.version
    });
    const tagMessage = crate.name === release.name
        ? `${crate.name} ${crate.version}`
        : `${crate.name} ${crate.version} (release ${release.version})`;
    const tags = await (0, exec_1.execAndSucceedWithOutput)('git', ['tag', '-l']);
    if (tags.stdout.split('\n').includes(tagName)) {
        (0, core_1.debug)(`Tag ${tagName} already exists, skipping`);
        return {
            tagName,
            crate
        };
    }
    (0, core_1.info)(`Tagging ${crate.name} as ${tagName} with message "${tagMessage}"`);
    await (0, exec_1.execAndSucceed)('git', [
        'tag',
        '-a',
        tagName,
        '-m',
        tagMessage,
        ...(inputs.tag.sign ? ['-s'] : [])
    ]);
    return {
        tagName,
        crate
    };
}
