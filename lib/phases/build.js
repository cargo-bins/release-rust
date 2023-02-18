"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const exec_1 = require("../common/exec");
const flags_1 = require("../common/flags");
const setup_1 = require("../schemata/setup");
const cross_1 = require("../targets/cross");
async function buildPhase(inputs, crates) {
    let useCross;
    if (inputs.build.useCross !== undefined) {
        useCross = inputs.build.useCross;
    }
    else if (inputs.setup.target === (0, setup_1.runnerHostTarget)()) {
        useCross = false;
    }
    else if ((0, cross_1.allowedCrossTarget)(inputs.setup.target)) {
        useCross = true;
    }
    else {
        useCross = false;
    }
    let output;
    if (inputs.hooks.customBuild) {
        await (0, exec_1.runHook)(inputs, 'custom-build');
    }
    else {
        const buildCommand = useCross ? 'cross' : 'cargo';
        const buildArgs = [
            '--release',
            '--target',
            inputs.setup.target,
            ...crates.flatMap(crate => [`--package`, crate.name])
        ];
        const rustflags = [];
        if (inputs.build.features.length > 0) {
            buildArgs.push('--features', inputs.build.features.join(','));
        }
        if (inputs.build.buildstd) {
            buildArgs.push('-Z', 'build-std=std');
        }
        if (inputs.build.debuginfo) {
            buildArgs.push(`--config='profile.release.split-debuginfo="packed"'`, `--config='profile.release.debug=2'`);
        }
        if (inputs.build.muslLibGcc &&
            inputs.setup.target.includes('-linux-') &&
            inputs.setup.target.includes('musl')) {
            rustflags.push('-C', 'link-arg=-lgcc', '-C', 'link-arg=-static-libgcc');
        }
        if (inputs.build.crtStatic !== undefined) {
            rustflags.push('-C', `target-feature=${inputs.build.crtStatic ? '+' : '-'}crt-static`);
        }
        else if (inputs.setup.target.includes('-alpine-linux-musl')) {
            rustflags.push('-C', 'target-feature=-crt-static');
        }
        else if (inputs.setup.target.endsWith('-windows-msvc')) {
            rustflags.push('-C', 'target-feature=+crt-static');
        }
        if (inputs.extras.rustcFlags) {
            rustflags.push(...(0, flags_1.extraFlags)(inputs, 'rustcFlags'));
        }
        if (inputs.extras.cargoFlags) {
            buildArgs.push(...(0, flags_1.extraFlags)(inputs, 'cargoFlags'));
        }
        (0, core_1.info)(`Rust flags: ${rustflags.join(' ')}`);
        (0, core_1.info)(`Build command: ${buildCommand} ${buildArgs.join(' ')}`);
        output = (await (0, exec_1.execAndSucceedWithOutput)(buildCommand, buildArgs, {
            env: Object.assign(Object.assign({}, (0, exec_1.hookEnv)(inputs)), { RUSTFLAGS: rustflags.join(' ') })
        })).stdout;
    }
    await (0, exec_1.runHook)(inputs, 'post-build');
    return output;
}
exports.default = buildPhase;
