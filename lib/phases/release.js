"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const core_1 = require("@actions/core");
const minimatch_1 = require("minimatch");
const pattern_list_1 = require("../common/pattern-list");
const exec_1 = require("../common/exec");
const glob_1 = require("../common/glob");
const template_1 = require("../common/template");
async function releasePhase(inputs, release, tags) {
    var _a, _b, _c;
    if (inputs.release.enabled) {
        const manifestPath = (0, node_path_1.join)(inputs.package.output, '.crates.json');
        (0, core_1.debug)(`Reading ${manifestPath}`);
        const manifests = JSON.parse(await (0, promises_1.readFile)(manifestPath, 'utf-8'));
        if (inputs.release.separately) {
            for (const tag of tags) {
                (0, core_1.info)(`Releasing tag ${tag.tagName}`);
                const releaseId = await ensureReleaseExists(inputs, tag, release);
                const manifest = manifests.find(({ name }) => name === tag.crate.name);
                const files = new Set(((_a = manifest === null || manifest === void 0 ? void 0 : manifest.packageFiles) !== null && _a !== void 0 ? _a : []).map(file => (0, node_path_1.join)(inputs.package.output, file)));
                await uploadAssets(inputs, releaseId, files);
            }
        }
        else {
            const tag = tags.find(tag => tag.crate.name === release.name);
            if (!tag) {
                throw new Error('No tag for release');
            }
            const releaseId = await ensureReleaseExists(inputs, tag, release);
            const files = new Set((await (0, glob_1.glob)((0, node_path_1.join)(inputs.package.output, '*'))).concat(((_c = (_b = manifests[0]) === null || _b === void 0 ? void 0 : _b.packageFiles) !== null && _c !== void 0 ? _c : []).map(file => (0, node_path_1.join)(inputs.package.output, file))));
            await uploadAssets(inputs, releaseId, files);
        }
    }
    await (0, exec_1.runHook)(inputs, 'post-release');
}
exports.default = releasePhase;
function patternPrecision(pattern) {
    const specials = pattern
        .split('')
        .filter(char => ['?', '*', '{', '}'].includes(char)).length;
    return 1 - specials / pattern.length;
}
function mapPatternFor(map, crateName) {
    const ordered = Object.entries(map).sort(([a], [b]) => patternPrecision(b) - patternPrecision(a));
    for (const [pattern, template] of ordered) {
        if (new minimatch_1.Minimatch(pattern, {
            debug: (0, core_1.isDebug)()
        }).match(crateName)) {
            (0, core_1.debug)(`Resolved template for ${crateName} to ${pattern}'s: "${template}"`);
            return template;
        }
    }
    (0, core_1.warning)(`No template found for crate ${crateName}, using default`);
    return null;
}
function isLatest(input, crateName) {
    if (typeof input === 'string') {
        return input === crateName;
    }
    return input !== false;
}
function isPre(input, crateName) {
    if (typeof input === 'boolean') {
        return input;
    }
    return new pattern_list_1.PatternList(input).matchOne(crateName);
}
async function ensureReleaseExists(inputs, tag, release) {
    var _a, _b;
    const extantRelease = await releaseId(inputs.credentials.github, tag.tagName);
    if (extantRelease) {
        (0, core_1.info)(`Release ${tag.tagName} already exists (ID=${extantRelease})`);
        return extantRelease;
    }
    else {
        (0, core_1.debug)(`Figuring out release details for ${tag.tagName}`);
        const vars = {
            target: inputs.setup.target,
            'crate-name': tag.crate.name,
            'crate-version': tag.crate.version,
            'release-name': release.name,
            'release-version': release.version,
            'release-tag': tag.tagName
        };
        const releaseName = (0, template_1.renderTemplate)((_a = mapPatternFor(inputs.release.name, tag.crate.name)) !== null && _a !== void 0 ? _a : '{crate-version}', vars);
        const releaseBody = (0, template_1.renderTemplate)((_b = mapPatternFor(inputs.release.notes, tag.crate.name)) !== null && _b !== void 0 ? _b : '', Object.assign(Object.assign({}, vars), { 'release-name': releaseName }));
        const markLatest = isLatest(inputs.release.latest, tag.crate.name);
        const markPre = isPre(inputs.release.pre, tag.crate.name);
        try {
            const newRelease = await createRelease(inputs.credentials.github, tag.tagName, releaseName, releaseBody, markPre, markLatest);
            (0, core_1.info)(`Created release ${tag.tagName} (ID=${newRelease})`);
            return newRelease;
        }
        catch (err) {
            (0, core_1.debug)('Creating failed, checking if release was created while we were trying');
            const extantRelease = await releaseId(inputs.credentials.github, tag.tagName);
            if (extantRelease) {
                (0, core_1.info)(`Release ${tag.tagName} already exists (ID=${extantRelease})`);
                return extantRelease;
            }
            (0, core_1.error)(`Failed to create release ${tag.tagName}: ${err}`);
            throw err;
        }
    }
}
async function releaseId(github, tag) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    try {
        (0, core_1.debug)(`Checking if release ${tag} exists`);
        const { data, status } = await github.rest.repos.getReleaseByTag({
            owner,
            repo,
            tag
        });
        if (status !== 200) {
            return null;
        }
        return data.id;
    }
    catch (err) {
        return null;
    }
}
async function createRelease(github, tag, name, body, prerelease, latest) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    (0, core_1.debug)(`Creating release ${tag}: ${JSON.stringify({
        name,
        body,
        prerelease,
        latest
    })}`);
    const { data, status } = await github.rest.repos.createRelease({
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
        throw new Error(`Failed to create release ${tag}: ${JSON.stringify(data)}`);
    }
    return data.id;
}
async function fileExists(file) {
    try {
        await (0, promises_1.access)(file, promises_1.constants.R_OK);
        return true;
    }
    catch (_) {
        return false;
    }
}
async function uploadAssets(inputs, releaseId, files) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    (0, core_1.info)(`Uploading ${files.size} assets to release ${releaseId}`);
    let uploaded = 0;
    for (const file of files) {
        if (!(await fileExists(file))) {
            (0, core_1.warning)(`Asset ${file} does not exist (or cannot be read), skipping`);
            continue;
        }
        for (const attempt of [1, 2, 3]) {
            try {
                if (attempt > 1) {
                    (0, core_1.info)(`Retrying upload of ${file} (attempt ${attempt})`);
                }
                else {
                    (0, core_1.info)(`Uploading ${file}`);
                }
                await inputs.credentials.github.rest.repos.uploadReleaseAsset({
                    owner,
                    repo,
                    release_id: releaseId,
                    name: (0, node_path_1.basename)(file),
                    data: `@${file}`
                });
                uploaded += 1;
                (0, core_1.info)(`Uploaded ${file}`);
                break;
            }
            catch (err) {
                if (attempt < 3) {
                    const delay = 10 + Math.ceil(Math.random() * 200);
                    (0, core_1.warning)(`Failed to upload ${file}: ${err}, retrying after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                else {
                    (0, core_1.error)(`Failed to upload ${file}: ${err}, skipping`);
                }
            }
        }
    }
    (0, core_1.info)(`Uploaded ${uploaded}/${files.size} assets to release ${releaseId}`);
}
