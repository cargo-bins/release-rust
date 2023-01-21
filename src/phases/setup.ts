import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {basename, join} from 'node:path';

import {addPath, debug, info} from '@actions/core';
import {mkdirP, mv} from '@actions/io';
import {
	downloadTool,
	extractTar,
	extractZip,
	cacheDir
} from '@actions/tool-cache';
import {rcompare, satisfies} from 'semver';
import {checkData, fromHex} from 'ssri';

import {execAndSucceed, runHook} from '../common/exec';
import {InputsType} from '../schemata/index';

export default async function setupPhase(inputs: InputsType): Promise<void> {
	await rustup(inputs);
	await binstall(inputs);
	await cross(inputs);
	await cosign(inputs);
	await rekor(inputs);
	await gitsign(inputs);

	if (inputs.tag.sign) {
		await configureGitsign();
	}

	await configureGitUser();

	await runHook(inputs, 'post-setup');
}

async function rustup(inputs: InputsType): Promise<void> {
	info('Installing rust toolchain...');
	const components = new Set(inputs.extras.rustupComponents);
	if (inputs.build.buildstd) {
		components.add('rust-src');
	}

	await execAndSucceed('rustup', [
		'toolchain',
		'install',
		inputs.setup.toolchain,
		'--profile',
		'minimal',
		'--component',
		[...components].join(',')
	]);

	await execAndSucceed('rustup', [
		'target',
		'add',
		inputs.setup.target,
		'--toolchain',
		inputs.setup.toolchain
	]);

	await execAndSucceed('rustup', ['default', inputs.setup.toolchain]);
}

// TODO: change to version that supports cosign!
const BINSTALL_BOOTSTRAP_VERSION = '0.19.1';
const BINSTALL_BOOTSTRAP_PACKAGE = {
	Linux: {
		url: `https://github.com/cargo-bins/cargo-binstall/releases/download/v${BINSTALL_BOOTSTRAP_VERSION}/cargo-binstall-x86_64-unknown-linux-musl.tgz`,
		sri: 'sha512-mdzgZg3JM2AvjU+pX12RCm5g+Spew+LBDVB36fQIQg81Ozgmy5AXlxksBBcBV/bgAMrJkv6qU4n/IDCJHrG+5A=='
	},
	macOS: {
		url: `https://github.com/cargo-bins/cargo-binstall/releases/download/v${BINSTALL_BOOTSTRAP_VERSION}/cargo-binstall-x86_64-apple-darwin.zip`,
		sri: 'sha512-VqgewgdYu2nT1QT9P50JXdn7AI8nhNb8oebFibdjUt2MpSmFtBbr19oK09+sZGWSamX60VujxLK5vkxz8n0xHg=='
	},
	Windows: {
		url: `https://github.com/cargo-bins/cargo-binstall/releases/download/v${BINSTALL_BOOTSTRAP_VERSION}/cargo-binstall-x86_64-pc-windows-msvc.zip`,
		sri: 'sha512-k1s9UW6Zb20llIuopUwbf3D38OP1F+Nkgf3wGWwsXPwoQfhuiR89+VF3Rrf7YF20fN3tG4/3jZSC3apiHbQ6NA=='
	}
};

async function binstall(inputs: InputsType): Promise<void> {
	info('Installing cargo-binstall...');
	const pkg =
		BINSTALL_BOOTSTRAP_PACKAGE[
			(process.env.RUNNER_OS ??
				'') as keyof typeof BINSTALL_BOOTSTRAP_PACKAGE
		];
	if (!pkg) {
		throw new Error(`Unsupported platform: ${process.env.RUNNER_OS}`);
	}

	const arcPath = await downloadTool(pkg.url);
	checkData(await readFile(arcPath), pkg.sri, {error: true});
	const folder = await (arcPath.endsWith('.zip')
		? extractZip(arcPath)
		: extractTar(arcPath));
	const path = await cacheDir(
		folder,
		'cargo-binstall',
		BINSTALL_BOOTSTRAP_VERSION
	);
	addPath(path);

	if (inputs.setup.binstallVersion === BINSTALL_BOOTSTRAP_VERSION) {
		info(
			`staying with bootstrapped cargo-binstall@${inputs.setup.binstallVersion}`
		);
		return;
	}

	info(`Installing cargo-binstall@${inputs.setup.binstallVersion}...`);
	execAndSucceed('cargo', [
		'binstall',
		'-y',
		'--no-symlinks',
		'--install-path',
		path,
		'--force',
		inputs.setup.binstallVersion
			? `cargo-binstall@${inputs.setup.binstallVersion}`
			: 'cargo-binstall'
	]);
}

interface CrossManifest {
	[target: string]: {
		url: string;
		checksum: string;
	};
}

async function cross(inputs: InputsType): Promise<void> {
	info('Installing cross...');
	const manifestPath = await downloadTool(
		'https://raw.githubusercontent.com/taiki-e/install-action/main/manifests/cross.json'
	);
	const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

	const version = inputs.setup.crossVersion ?? manifest.latest.version;
	const versionInfo = manifest[version] as CrossManifest;
	if (!versionInfo) {
		throw new Error(
			`Unsupported cross version: ${inputs.setup.crossVersion}`
		);
	}

	let arch;
	switch (process.env.RUNNER_OS) {
		case 'Linux':
			arch = versionInfo['x86_64_linux_musl'];
			break;
		case 'macOS':
			arch = versionInfo['x86_64_macos'];
			break;
		case 'Windows':
			arch = versionInfo['x86_64_windows'];
			break;
		default:
			throw new Error(`Unsupported platform: ${process.env.RUNNER_OS}`);
	}

	const arcPath = await downloadTool(arch.url);
	const sri = fromHex(arch.checksum, 'sha256');
	checkData(await readFile(arcPath), sri, {error: true});

	const folder = await extractTar(arcPath);
	const path = await cacheDir(folder, 'cross', version);
	addPath(path);

	info(`Installed cross@${version}`);
}

const COSIGN_DIR = join(homedir(), '.cosign');
const COSIGN_BOOTSTRAP_VERSION = '0.13.1';
const COSIGN_BOOTSTRAP_PACKAGE = {
	Linux: {
		url: `https://github.com/sigstore/cosign/releases/download/v${COSIGN_BOOTSTRAP_VERSION}/cosign-linux-amd64`,
		sri: 'sha512-y7rypv0grYX74WtHEPztUpVH+dO24YiBlLoQWINTz4DrpdVlAggxkKfpn9E9XPENSmmY+ARM8ywZ+S/WpH6lKg=='
	},
	macOS: {
		url: `https://github.com/sigstore/cosign/releases/download/v${COSIGN_BOOTSTRAP_VERSION}/cosign-darwin-amd64`,
		sri: 'sha512-rB6DPtDtQPvRtXJS+xAQ+fIZwZ3CYPSoS25qQIODsBeY09FgvXQOb5EpQvyoZbfTbF0OrOsAU3S0rxYeXnuzjw=='
	},
	Windows: {
		url: `https://github.com/sigstore/cosign/releases/download/v${COSIGN_BOOTSTRAP_VERSION}/cosign-windows-amd64.exe`,
		sri: 'sha512-V8uTLshlhOFt3b7W9XHvBiGInbbTPLds5KbitjrqXVb0kVu82e9aEKYTAILYEa+pPykN8WNmHPEJurVe0E3LYw=='
	}
};

async function cosign(inputs: InputsType): Promise<void> {
	info('Installing cosign...');
	const pkg =
		COSIGN_BOOTSTRAP_PACKAGE[
			(process.env.RUNNER_OS ??
				'') as keyof typeof COSIGN_BOOTSTRAP_PACKAGE
		];
	if (!pkg) {
		throw new Error(`Unsupported platform: ${process.env.RUNNER_OS}`);
	}

	const {dl, final} = sigstoreToolFileName('cosign');

	const bsPath = await downloadTool(pkg.url);
	checkData(await readFile(bsPath), pkg.sri, {error: true});
	debug(
		`Downloaded bootstrapping cosign@${COSIGN_BOOTSTRAP_VERSION} to ${bsPath}`
	);

	await mkdirP(COSIGN_DIR);
	addPath(COSIGN_DIR);

	const realVersion =
		inputs.setup.cosignVersion ??
		(await fetchLatestReleaseVersion(
			inputs,
			'sigstore',
			'cosign',
			'^1.13.0'
		));

	if (realVersion === COSIGN_BOOTSTRAP_VERSION) {
		info(`Staying with bootstrapped cosign@${realVersion}`);
		await mv(bsPath, join(COSIGN_DIR, final));
		return;
	}

	debug(`Fetching cosign@${realVersion}...`);
	const realPath = await fetchSigstoreToolWithCosign(
		`https://github.com/sigstore/cosign/releases/download/v${realVersion}/${dl}`,
		bsPath
	);
	await mv(realPath, join(COSIGN_DIR, final));
	info(`Installed cosign@${realVersion}`);
}

async function rekor(inputs: InputsType): Promise<void> {
	info('Installing rekor...');

	const version =
		inputs.setup.rekorVersion ??
		(await fetchLatestReleaseVersion(
			inputs,
			'sigstore',
			'rekor',
			'^1.0.0'
		));

	const {dl, final} = sigstoreToolFileName('rekor-cli');

	debug(`Fetching rekor@${version}...`);
	const path = await fetchSigstoreToolWithCosign(
		`https://github.com/sigstore/rekor/releases/download/v${version}/${dl}`
	);

	await mv(path, join(COSIGN_DIR, final));
	info(`Installed rekor@${version}`);
}

async function gitsign(inputs: InputsType): Promise<void> {
	info('Installing gitsign...');

	const version =
		inputs.setup.gitsignVersion ??
		(await fetchLatestReleaseVersion(
			inputs,
			'sigstore',
			'gitsign',
			'>=0.4.0'
		));

	// gitsign uses a different naming scheme for SOME REASON
	let {dl, final} = sigstoreToolFileName(`gitsign_${version}`);
	dl = dl.replace(/-/g, '_');
	final = final.replace(`_${version}`, '');

	debug(`Fetching gitsign@${version}...`);
	const path = await fetchSigstoreToolWithCosign(
		`https://github.com/sigstore/gitsign/releases/download/v${version}/${dl}`,
		'cosign',
		''
	);

	await mv(path, join(COSIGN_DIR, final));
	info(`Installed gitsign@${version}`);
}

async function configureGitsign(): Promise<void> {
	info('Configuring git to use gitsign...');
	await execAndSucceed('git', ['config', '--global', 'tag.gpgsign', 'true']);
	await execAndSucceed('git', [
		'config',
		'--global',
		'gpg.x509.program',
		'gitsign'
	]);
	await execAndSucceed('git', ['config', '--global', 'gpg.format', 'x509']);
}

async function configureGitUser(): Promise<void> {
	info('Configuring git user...');
	await execAndSucceed('git', [
		'config',
		'--global',
		'user.name',
		'GitHub Actions (release-rust)'
	]);
	// This email identifies the commit as GitHub Actions - see https://github.com/orgs/community/discussions/26560
	await execAndSucceed('git', [
		'config',
		'--global',
		'user.email',
		'"41898282+github-actions[bot]@users.noreply.github.com>"'
	]);
}

function sigstoreToolFileName(name: string): {
	dl: string;
	final: string;
} {
	let platform;
	let ext = '';
	switch (process.env.RUNNER_OS) {
		case 'Linux':
			platform = 'linux';
			break;
		case 'macOS':
			platform = 'darwin';
			break;
		case 'Windows':
			platform = 'windows';
			ext = '.exe';
			break;
		default:
			throw new Error(`Unsupported platform: ${process.env.RUNNER_OS}`);
	}

	return {dl: `${name}-${platform}-amd64${ext}`, final: `${name}${ext}`};
}

async function fetchLatestReleaseVersion(
	inputs: InputsType,
	owner: string,
	repo: string,
	matches: string
): Promise<string | undefined> {
	debug(`Fetching all ${repo} versions...`);
	const allVersionsQL: {
		repository: {releases: {nodes: {tagName: string}[]}};
	} = await inputs.credentials.github.graphql(`query {
		repository(owner: "${owner}", name: "${repo}") {
			releases(last: 100) {
				nodes {
					tagName
				}
			}
		}
	}`);

	return allVersionsQL.repository.releases.nodes
		.map(r => r.tagName)
		.filter(v => v.startsWith('v'))
		.map(v => v.slice(1))
		.filter(v => satisfies(v, matches))
		.sort(rcompare)[0];
}

async function fetchSigstoreToolWithCosign(
	url: string,
	cosignPath: string = 'cosign',
	sigsSuffix: string = '-keyless'
): Promise<string> {
	const path = await downloadTool(url);
	const sig = await downloadTool(`${url}${sigsSuffix}.sig`);
	const crt = await downloadTool(`${url}${sigsSuffix}.pem`);

	debug(`Verifying ${url} with ${cosignPath}...`);
	await execAndSucceed(
		cosignPath,
		['verify-blob', '--certificate', crt, '--signature', sig, path],
		{
			env: {
				COSIGN_EXPERIMENTAL: '1'
			}
		}
	);

	return path;
}
