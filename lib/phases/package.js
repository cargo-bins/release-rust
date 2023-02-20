"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable @typescript-eslint/no-non-null-assertion
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const core_1 = require("@actions/core");
const io_1 = require("@actions/io");
const output_1 = require("../cargo/output");
const exec_1 = require("../common/exec");
const glob_1 = require("../common/glob");
const pattern_list_1 = require("../common/pattern-list");
const template_1 = require("../common/template");
async function packagePhase(inputs, crates, release, buildOutput) {
    // Find artifacts for all the crates we're packaging
    const artifactsFromOutput = (0, output_1.parseOutput)(buildOutput !== null && buildOutput !== void 0 ? buildOutput : '')
        .filter(output_1.isArtifactMessage)
        .filter(artifact => crates.map(crate => crate.id).includes(artifact.package_id));
    (0, core_1.debug)(`Creating temporary directory for packaging`);
    const packagingDir = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'packaging-'));
    const manifests = [];
    if (inputs.package.separately) {
        for (const crate of crates) {
            const artifacts = artifactsFromOutput.filter(artifact => artifact.package_id === crate.id);
            manifests.push(await prepareCrate(inputs, crate, release, artifacts, packagingDir));
        }
    }
    else {
        manifests.push(await prepareWhole(inputs, release, artifactsFromOutput, packagingDir));
    }
    const manifestPath = (0, node_path_1.join)(inputs.package.output, '.crates.json');
    (0, core_1.debug)(`Writing ${manifestPath}`);
    await (0, promises_1.writeFile)(manifestPath, JSON.stringify(manifests, null, 2));
    const hooksEnv = {
        RELEASE_PACKAGE_SEPARATELY: inputs.package.separately.toString(),
        RELEASE_PACKAGING_DIR: packagingDir
    };
    if (inputs.package.separately) {
        for (const crate of crates) {
            const manifest = manifests.find(manifest => manifest.name === crate.name);
            await (0, exec_1.runHook)(inputs, 'pre-package', Object.assign(Object.assign({}, hooksEnv), { RELEASE_PACKAGE_NAME: manifest.packageName, RELEASE_PACKAGE_CRATE_NAME: crate.name, RELEASE_PACKAGE_CRATE_VERSION: crate.version }));
            const pkgfile = await archive(inputs, manifest.packageName, (0, node_path_1.join)(packagingDir, crate.name));
            if (pkgfile)
                manifest.packageFiles.push(pkgfile);
        }
    }
    else {
        const manifest = manifests[0];
        await (0, exec_1.runHook)(inputs, 'pre-package', Object.assign(Object.assign({}, hooksEnv), { RELEASE_PACKAGE_NAME: manifest.packageName, RELEASE_PACKAGE_CRATE_NAME: release.name, RELEASE_PACKAGE_CRATE_VERSION: release.version }));
        const pkgfile = await archive(inputs, manifest.packageName, (0, node_path_1.join)(packagingDir, release.name));
        if (pkgfile)
            manifest.packageFiles.push(pkgfile);
    }
    (0, core_1.debug)(`Writing ${manifestPath} (with packageFiles)`);
    await (0, promises_1.writeFile)(manifestPath, JSON.stringify(manifests, null, 2));
    await (0, exec_1.runHook)(inputs, 'post-package', {
        RELEASE_PACKAGE_SEPARATELY: inputs.package.separately.toString(),
        RELEASE_PACKAGING_DIR: packagingDir
    }, inputs.package.output);
}
exports.default = packagePhase;
async function prepareCrate(inputs, crate, release, artifacts, packagingDir) {
    const packageName = (0, template_1.renderTemplate)(inputs.package.name, {
        target: inputs.setup.target,
        'crate-name': crate.name,
        'crate-version': crate.version,
        'release-name': release.name,
        'release-version': release.version
    });
    const cargoFiles = artifacts.flatMap(artifact => artifact.filenames);
    (0, core_1.debug)(`Cargo artifacts for ${crate.name}: ${cargoFiles.join(', ')}`);
    await (0, output_1.findDebugSymbols)(cargoFiles);
    (0, core_1.debug)(`All cargo artifacts for ${crate.name}: ${cargoFiles.join(', ')}`);
    let dir = (0, node_path_1.join)(packagingDir, crate.name);
    if (inputs.package.inDir) {
        dir = (0, node_path_1.join)(dir, packageName);
        await (0, io_1.mkdirP)(dir);
    }
    (0, core_1.debug)(`Evaluating package-files input (crate: ${crate.name})`);
    const packageFiles = new pattern_list_1.PatternList(inputs.package.files);
    const extraFiles = await packageFiles.findFiles();
    (0, core_1.debug)(`Extra files for ${crate.name}: ${extraFiles.join(', ')}`);
    const files = [...cargoFiles, ...extraFiles];
    for (const file of files) {
        (0, core_1.debug)(`Copying ${file} to ${dir} (crate: ${crate.name})`);
        await (0, io_1.cp)(file, dir, { recursive: true });
    }
    return {
        name: crate.name,
        version: crate.version,
        files,
        packageName,
        packageFiles: []
    };
}
async function prepareWhole(inputs, release, artifacts, packagingDir) {
    const packageName = (0, template_1.renderTemplate)(inputs.package.name, {
        target: inputs.setup.target,
        'crate-name': release.name,
        'crate-version': release.version,
        'release-name': release.name,
        'release-version': release.version
    });
    const cargoFiles = artifacts.flatMap(artifact => artifact.filenames);
    (0, core_1.debug)(`Cargo artifacts: ${cargoFiles.join(', ')}`);
    await (0, output_1.findDebugSymbols)(cargoFiles);
    (0, core_1.debug)(`All cargo artifacts: ${cargoFiles.join(', ')}`);
    let dir = (0, node_path_1.join)(packagingDir, release.name);
    if (inputs.package.inDir) {
        dir = (0, node_path_1.join)(dir, packageName);
        await (0, io_1.mkdirP)(dir);
    }
    (0, core_1.debug)('Evaluating package-files input');
    const packageFiles = new pattern_list_1.PatternList(inputs.package.files);
    const extraFiles = await packageFiles.findFiles();
    (0, core_1.debug)(`Extra files: ${extraFiles.join(', ')}`);
    const files = [...cargoFiles, ...extraFiles];
    for (const file of files) {
        (0, core_1.debug)(`Copying ${file} to ${dir}`);
        await (0, io_1.cp)(file, dir, { recursive: true });
    }
    return {
        name: release.name,
        version: release.version,
        files,
        packageName,
        packageFiles: []
    };
}
async function archive(inputs, packageName, fromDir) {
    const { archive, shortExt } = inputs.package;
    if (archive === 'none')
        return null;
    let ext;
    switch (archive) {
        case 'zip':
            ext = 'zip';
            break;
        case 'tar+gzip':
            ext = shortExt ? 'tgz' : 'tar.gz';
            break;
        case 'tar+bzip2':
            ext = shortExt ? 'tbz2' : 'tar.bz2';
            break;
        case 'tar+xz':
            ext = shortExt ? 'txz' : 'tar.xz';
            break;
        case 'tar+zstd':
            ext = shortExt ? 'tzst' : 'tar.zst';
            break;
    }
    const filename = `${packageName}.${ext}`;
    const output = (0, node_path_1.join)(inputs.package.output, filename);
    (0, core_1.debug)(`Archiving ${fromDir} to ${output}`);
    const fileList = await (0, glob_1.glob)((0, node_path_1.join)(fromDir, '*'), { dot: true });
    (0, core_1.debug)(`Files to archive: ${fileList.join(', ')}`);
    if (archive === 'zip') {
        await zip(fileList, output);
    }
    else {
        const tarname = (0, node_path_1.join)(inputs.package.output, `${packageName}.tar`);
        await tar(fileList, tarname);
        await compress(archive, tarname, output);
    }
    return filename;
}
async function zip(fileList, toFile) {
    if (process.env.RUNNER_OS === 'Windows') {
        await (0, exec_1.execAndSucceed)('7z', ['a', '-mx9', toFile, ...fileList]);
    }
    else {
        await (0, exec_1.execAndSucceed)('zip', ['-r', '-9', toFile, ...fileList]);
    }
}
async function tar(fileList, toFile) {
    await (0, exec_1.execAndSucceed)('tar', ['cf', toFile, ...fileList]);
}
async function compress(archive, fromFile, toFile) {
    switch (archive) {
        case 'tar+gzip':
        case 'tar+bzip2':
        case 'tar+xz':
            await (0, exec_1.execAndSucceed)('sh', [
                '-c',
                `${archive.split('+')[1]} -9 --stdout "${fromFile}" > "${toFile}"`
            ]);
            break;
        case 'tar+zstd':
            await (0, exec_1.execAndSucceed)('zstd', [
                '-22',
                '--ultra',
                '-T0',
                '-o',
                toFile,
                fromFile
            ]);
            break;
    }
}
