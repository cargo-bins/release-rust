"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const core_1 = require("@actions/core");
const io_1 = require("@actions/io");
const tool_cache_1 = require("@actions/tool-cache");
const semver_1 = require("semver");
const ssri_1 = require("ssri");
const exec_1 = require("../common/exec");
async function setupPhase(inputs) {
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
    await manifestUtils();
    await (0, exec_1.runHook)(inputs, 'post-setup');
}
exports.default = setupPhase;
async function manifestUtils() {
    (0, core_1.info)('Installing .crates.json manifest manipulation tools...');
    await (0, io_1.mkdirP)((0, node_path_1.join)((0, node_os_1.homedir)(), '.cargo', 'bin'));
    (0, core_1.debug)('Installing _rr_add_pkg...');
    await (0, promises_1.writeFile)((0, node_path_1.join)((0, node_os_1.homedir)(), '.cargo', 'bin', '_rr_add_pkg'), `#!/bin/bash
		set -euxo pipefail
		cratefilter=\${1:?specify crate filter}
		file=\${2:?specify file to add}
		cp "$RELEASE_PACKAGE_OUTPUT/.crates.json" "$RELEASE_PACKAGE_OUTPUT/.crates.json.bak"
		jq --indent 2 --ascii-output --arg file "$file" '[.[] | (if ('"$cratefilter"') then (.packageFiles += [$file]) else (.) end)]' "$RELEASE_PACKAGE_OUTPUT/.crates.json.bak" > "$RELEASE_PACKAGE_OUTPUT/.crates.json"
		`, { mode: 0o755 });
}
async function rustup(inputs) {
    (0, core_1.info)('Installing rust toolchain...');
    const components = new Set(inputs.extras.rustupComponents);
    if (inputs.build.buildstd) {
        components.add('rust-src');
    }
    await (0, exec_1.execAndSucceed)('rustup', [
        'toolchain',
        'install',
        inputs.setup.toolchain,
        '--profile',
        'minimal',
        '--component',
        [...components].join(',')
    ]);
    await (0, exec_1.execAndSucceed)('rustup', [
        'target',
        'add',
        inputs.setup.target,
        '--toolchain',
        inputs.setup.toolchain
    ]);
    await (0, exec_1.execAndSucceed)('rustup', ['default', inputs.setup.toolchain]);
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
async function binstall(inputs) {
    var _a;
    (0, core_1.info)('Installing cargo-binstall...');
    const pkg = BINSTALL_BOOTSTRAP_PACKAGE[((_a = process.env.RUNNER_OS) !== null && _a !== void 0 ? _a : '')];
    if (!pkg) {
        throw new Error(`Unsupported platform: ${process.env.RUNNER_OS}`);
    }
    const arcPath = await (0, tool_cache_1.downloadTool)(pkg.url);
    (0, ssri_1.checkData)(await (0, promises_1.readFile)(arcPath), pkg.sri, { error: true });
    const folder = await (arcPath.endsWith('.zip')
        ? (0, tool_cache_1.extractZip)(arcPath)
        : (0, tool_cache_1.extractTar)(arcPath));
    const path = await (0, tool_cache_1.cacheDir)(folder, 'cargo-binstall', BINSTALL_BOOTSTRAP_VERSION);
    (0, core_1.addPath)(path);
    if (inputs.setup.binstallVersion === BINSTALL_BOOTSTRAP_VERSION) {
        (0, core_1.info)(`staying with bootstrapped cargo-binstall@${inputs.setup.binstallVersion}`);
        return;
    }
    (0, core_1.info)(`Installing cargo-binstall@${inputs.setup.binstallVersion}...`);
    (0, exec_1.execAndSucceed)('cargo', [
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
async function cross(inputs) {
    var _a;
    (0, core_1.info)('Installing cross...');
    const manifestPath = await (0, tool_cache_1.downloadTool)('https://raw.githubusercontent.com/taiki-e/install-action/main/manifests/cross.json');
    const manifest = JSON.parse(await (0, promises_1.readFile)(manifestPath, 'utf8'));
    const version = (_a = inputs.setup.crossVersion) !== null && _a !== void 0 ? _a : manifest.latest.version;
    const versionInfo = manifest[version];
    if (!versionInfo) {
        throw new Error(`Unsupported cross version: ${inputs.setup.crossVersion}`);
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
    const arcPath = await (0, tool_cache_1.downloadTool)(arch.url);
    const sri = (0, ssri_1.fromHex)(arch.checksum, 'sha256');
    (0, ssri_1.checkData)(await (0, promises_1.readFile)(arcPath), sri, { error: true });
    const folder = await (0, tool_cache_1.extractTar)(arcPath);
    const path = await (0, tool_cache_1.cacheDir)(folder, 'cross', version);
    (0, core_1.addPath)(path);
    (0, core_1.info)(`Installed cross@${version}`);
}
const COSIGN_DIR = (0, node_path_1.join)((0, node_os_1.homedir)(), '.cosign');
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
async function cosign(inputs) {
    var _a, _b;
    (0, core_1.info)('Installing cosign...');
    const pkg = COSIGN_BOOTSTRAP_PACKAGE[((_a = process.env.RUNNER_OS) !== null && _a !== void 0 ? _a : '')];
    if (!pkg) {
        throw new Error(`Unsupported platform: ${process.env.RUNNER_OS}`);
    }
    const { dl, final } = sigstoreToolFileName('cosign');
    const bsPath = await (0, tool_cache_1.downloadTool)(pkg.url);
    (0, ssri_1.checkData)(await (0, promises_1.readFile)(bsPath), pkg.sri, { error: true });
    (0, core_1.debug)(`Downloaded bootstrapping cosign@${COSIGN_BOOTSTRAP_VERSION} to ${bsPath}`);
    await (0, io_1.mkdirP)(COSIGN_DIR);
    (0, core_1.addPath)(COSIGN_DIR);
    const realVersion = (_b = inputs.setup.cosignVersion) !== null && _b !== void 0 ? _b : (await fetchLatestReleaseVersion(inputs, 'sigstore', 'cosign', '^1.13.0'));
    if (realVersion === COSIGN_BOOTSTRAP_VERSION) {
        (0, core_1.info)(`Staying with bootstrapped cosign@${realVersion}`);
        await (0, io_1.mv)(bsPath, (0, node_path_1.join)(COSIGN_DIR, final));
        return;
    }
    (0, core_1.debug)(`Fetching cosign@${realVersion}...`);
    const realPath = await fetchSigstoreToolWithCosign(`https://github.com/sigstore/cosign/releases/download/v${realVersion}/${dl}`, bsPath);
    await (0, io_1.mv)(realPath, (0, node_path_1.join)(COSIGN_DIR, final));
    (0, core_1.info)(`Installed cosign@${realVersion}`);
}
async function rekor(inputs) {
    var _a;
    (0, core_1.info)('Installing rekor...');
    const version = (_a = inputs.setup.rekorVersion) !== null && _a !== void 0 ? _a : (await fetchLatestReleaseVersion(inputs, 'sigstore', 'rekor', '^1.0.0'));
    const { dl, final } = sigstoreToolFileName('rekor-cli');
    (0, core_1.debug)(`Fetching rekor@${version}...`);
    const path = await fetchSigstoreToolWithCosign(`https://github.com/sigstore/rekor/releases/download/v${version}/${dl}`);
    await (0, io_1.mv)(path, (0, node_path_1.join)(COSIGN_DIR, final));
    (0, core_1.info)(`Installed rekor@${version}`);
}
async function gitsign(inputs) {
    var _a;
    (0, core_1.info)('Installing gitsign...');
    const version = (_a = inputs.setup.gitsignVersion) !== null && _a !== void 0 ? _a : (await fetchLatestReleaseVersion(inputs, 'sigstore', 'gitsign', '>=0.4.0'));
    // gitsign uses a different naming scheme for SOME REASON
    let { dl, final } = sigstoreToolFileName(`gitsign_${version}`);
    dl = dl.replace(/-/g, '_');
    final = final.replace(`_${version}`, '');
    (0, core_1.debug)(`Fetching gitsign@${version}...`);
    const path = await fetchSigstoreToolWithCosign(`https://github.com/sigstore/gitsign/releases/download/v${version}/${dl}`, 'cosign', '');
    await (0, io_1.mv)(path, (0, node_path_1.join)(COSIGN_DIR, final));
    (0, core_1.info)(`Installed gitsign@${version}`);
}
async function configureGitsign() {
    (0, core_1.info)('Configuring git to use gitsign...');
    await (0, exec_1.execAndSucceed)('git', ['config', '--global', 'tag.gpgsign', 'true']);
    await (0, exec_1.execAndSucceed)('git', [
        'config',
        '--global',
        'gpg.x509.program',
        'gitsign'
    ]);
    await (0, exec_1.execAndSucceed)('git', ['config', '--global', 'gpg.format', 'x509']);
}
async function configureGitUser() {
    (0, core_1.info)('Configuring git user...');
    await (0, exec_1.execAndSucceed)('git', [
        'config',
        '--global',
        'user.name',
        'GitHub Actions (release-rust)'
    ]);
    // This email identifies the commit as GitHub Actions - see https://github.com/orgs/community/discussions/26560
    await (0, exec_1.execAndSucceed)('git', [
        'config',
        '--global',
        'user.email',
        '41898282+github-actions[bot]@users.noreply.github.com>'
    ]);
}
function sigstoreToolFileName(name) {
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
    return { dl: `${name}-${platform}-amd64${ext}`, final: `${name}${ext}` };
}
async function fetchLatestReleaseVersion(inputs, owner, repo, matches) {
    (0, core_1.debug)(`Fetching all ${repo} versions...`);
    const allVersionsQL = await inputs.credentials.github.graphql(`query {
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
        .filter(v => (0, semver_1.satisfies)(v, matches))
        .sort(semver_1.rcompare)[0];
}
async function fetchSigstoreToolWithCosign(url, cosignPath = 'cosign', sigsSuffix = '-keyless') {
    const path = await (0, tool_cache_1.downloadTool)(url);
    const sig = await (0, tool_cache_1.downloadTool)(`${url}${sigsSuffix}.sig`);
    const crt = await (0, tool_cache_1.downloadTool)(`${url}${sigsSuffix}.pem`);
    (0, core_1.debug)(`Verifying ${url} with ${cosignPath}...`);
    await (0, exec_1.execAndSucceed)(cosignPath, ['verify-blob', '--certificate', crt, '--signature', sig, path], {
        env: {
            COSIGN_EXPERIMENTAL: '1'
        }
    });
    return path;
}
