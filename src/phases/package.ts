import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {debug} from '@actions/core';
import {cp, mkdirP} from '@actions/io';

import {CargoPackage} from '../cargo/metadata';
import {
	ArtifactMessage,
	findDebugSymbols,
	isArtifactMessage,
	parseOutput
} from '../cargo/output';
import {execAndSucceed, runHook} from '../common/exec';
import {glob} from '../common/glob';
import {PatternList} from '../common/pattern-list';
import {renderTemplate} from '../common/template';
import {InputsType} from '../schemata/index';

export default async function packagePhase(
	inputs: InputsType,
	crates: CargoPackage[],
	release: CargoPackage,
	buildOutput?: string
): Promise<void> {
	// Find artifacts for all the crates we're packaging
	const artifactsFromOutput = parseOutput(buildOutput ?? '')
		.filter(isArtifactMessage)
		.filter(artifact =>
			crates.map(crate => crate.id).includes(artifact.package_id)
		);

	debug(`Creating temporary directory for packaging`);
	const packagingDir = await mkdtemp(join(tmpdir(), 'packaging-'));

	const manifests = [];
	if (inputs.package.separately) {
		for (const crate of crates) {
			const artifacts = artifactsFromOutput.filter(
				artifact => artifact.package_id === crate.id
			);
			manifests.push(
				await prepareCrate(
					inputs,
					crate,
					release,
					artifacts,
					packagingDir
				)
			);
		}
	} else {
		manifests.push(
			await prepareWhole(
				inputs,
				release,
				artifactsFromOutput,
				packagingDir
			)
		);
	}

	const manifestPath = join(packagingDir, 'crates.json');
	debug(`Writing ${manifestPath}`);
	await writeFile(manifestPath, JSON.stringify(manifests, null, 2));

	const hooksEnv = {
		RELEASE_PACKAGE_SEPARATELY: inputs.package.separately.toString(),
		RELEASE_PACKAGING_DIR: packagingDir
	};

	if (inputs.package.separately) {
		for (const crate of crates) {
			const {packageName} = manifests.find(
				manifest => manifest.name === crate.name
			)!;
			await runHook(inputs, 'pre-package', {
				...hooksEnv,
				RELEASE_PACKAGE_NAME: packageName,
				RELEASE_PACKAGE_CRATE_NAME: crate.name,
				RELEASE_PACKAGE_CRATE_VERSION: crate.version
			});
			await archive(inputs, packageName, join(packagingDir, crate.name));
		}
	} else {
		const {packageName} = manifests[0]!;
		await runHook(inputs, 'pre-package', {
			...hooksEnv,
			RELEASE_PACKAGE_NAME: packageName,
			RELEASE_PACKAGE_CRATE_NAME: release.name,
			RELEASE_PACKAGE_CRATE_VERSION: release.version
		});
		await archive(inputs, packageName, join(packagingDir, release.name));
	}

	await runHook(
		inputs,
		'post-package',
		{
			RELEASE_PACKAGE_SEPARATELY: inputs.package.separately.toString(),
			RELEASE_PACKAGING_DIR: packagingDir
		},
		inputs.package.output
	);
}

async function prepareCrate(
	inputs: InputsType,
	crate: CargoPackage,
	release: CargoPackage,
	artifacts: ArtifactMessage[],
	packagingDir: string
): Promise<CrateManifest> {
	const packageName = renderTemplate(inputs.package.name, {
		target: inputs.setup.target,
		'crate-name': crate.name,
		'crate-version': crate.version,
		'release-name': release.name,
		'release-version': release.version
	});

	const cargoFiles = artifacts.flatMap(artifact => artifact.filenames);
	debug(`Cargo artifacts for ${crate.name}: ${cargoFiles.join(', ')}`);

	await findDebugSymbols(cargoFiles);
	debug(`All cargo artifacts for ${crate.name}: ${cargoFiles.join(', ')}`);

	let dir = join(packagingDir, crate.name);
	if (inputs.package.inDir) {
		dir = join(dir, packageName);
		await mkdirP(dir);
	}

	debug(`Evaluating package-files input (crate: ${crate.name})`);
	const packageFiles = new PatternList(inputs.package.files);
	const extraFiles = await packageFiles.findFiles();
	debug(`Extra files for ${crate.name}: ${extraFiles.join(', ')}`);

	const files = [...cargoFiles, ...extraFiles];
	for (const file of files) {
		debug(`Copying ${file} to ${dir} (crate: ${crate.name})`);
		await cp(file, dir, {recursive: true});
	}

	return {
		name: crate.name,
		version: crate.version,
		packageName,
		files
	};
}

async function prepareWhole(
	inputs: InputsType,
	release: CargoPackage,
	artifacts: ArtifactMessage[],
	packagingDir: string
): Promise<CrateManifest> {
	const packageName = renderTemplate(inputs.package.name, {
		target: inputs.setup.target,
		'crate-name': release.name,
		'crate-version': release.version,
		'release-name': release.name,
		'release-version': release.version
	});

	const cargoFiles = artifacts.flatMap(artifact => artifact.filenames);
	debug(`Cargo artifacts: ${cargoFiles.join(', ')}`);

	await findDebugSymbols(cargoFiles);
	debug(`All cargo artifacts: ${cargoFiles.join(', ')}`);

	let dir = join(packagingDir, release.name);
	if (inputs.package.inDir) {
		dir = join(dir, packageName);
		await mkdirP(dir);
	}

	debug('Evaluating package-files input');
	const packageFiles = new PatternList(inputs.package.files);
	const extraFiles = await packageFiles.findFiles();
	debug(`Extra files: ${extraFiles.join(', ')}`);

	const files = [...cargoFiles, ...extraFiles];
	for (const file of files) {
		debug(`Copying ${file} to ${dir}`);
		await cp(file, dir, {recursive: true});
	}

	return {
		name: release.name,
		version: release.version,
		packageName,
		files
	};
}

interface CrateManifest {
	name: string;
	version: string;
	packageName: string;
	files: string[];
}

async function archive(
	inputs: InputsType,
	packageName: string,
	fromDir: string
): Promise<void> {
	const {archive, shortExt} = inputs.package;
	if (archive === 'none') return;

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

	const output = join(inputs.package.output, `${packageName}.${ext}`);
	debug(`Archiving ${fromDir} to ${output}`);

	const fileList = await glob(join(fromDir, '*'), {dot: true});
	debug(`Files to archive: ${fileList.join(', ')}`);

	if (archive === 'zip') {
		await zip(fileList, output);
	} else {
		const tarname = join(inputs.package.output, `${packageName}.tar`);
		await tar(fileList, tarname);
		await compress(archive, tarname, output);
	}
}

async function zip(fileList: string[], toFile: string): Promise<void> {
	if (process.env.RUNNER_OS === 'Windows') {
		await execAndSucceed('7z', ['a', '-mx9', toFile, ...fileList]);
	} else {
		await execAndSucceed('zip', ['-r', '-9', toFile, ...fileList]);
	}
}

async function tar(fileList: string[], toFile: string): Promise<void> {
	await execAndSucceed('tar', ['cf', toFile, ...fileList]);
}

async function compress(
	archive: string,
	fromFile: string,
	toFile: string
): Promise<void> {
	switch (archive) {
		case 'tar+gzip':
		case 'tar+bzip2':
		case 'tar+xz':
			await execAndSucceed('sh', [
				'-c',
				`${
					archive.split('+')[1]
				} -9 --stdout "${fromFile}" > "${toFile}"`
			]);
			break;
		case 'tar+zstd':
			await execAndSucceed('zstd', [
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
