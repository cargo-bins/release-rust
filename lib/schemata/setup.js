"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetup = exports.runnerHostTarget = void 0;
const core_1 = require("@actions/core");
const semver_1 = require("semver");
const yup_1 = require("yup");
const SCHEMA = (0, yup_1.object)({
    toolchain: (0, yup_1.string)()
        .matches(/^(stable|nightly|1[.]\d+[.]\d+|nightly-\d+-\d+-\d+)$/)
        .default('nightly')
        .required(),
    target: (0, yup_1.string)(),
    binstallVersion: (0, yup_1.string)(),
    cosignVersion: (0, yup_1.string)(),
    rekorVersion: (0, yup_1.string)(),
    gitsignVersion: (0, yup_1.string)(),
    crossVersion: (0, yup_1.string)()
}).noUnknown();
function runnerHostTarget() {
    switch (process.env.RUNNER_OS) {
        case 'Linux':
            return 'x86_64-unknown-linux-gnu';
        case 'macOS':
            return 'x86_64-apple-darwin';
        case 'Windows':
            return 'x86_64-pc-windows-msvc';
        default:
            throw new Error(`Unsupported runner OS: ${process.env.RUNNER_OS}`);
    }
}
exports.runnerHostTarget = runnerHostTarget;
async function getSetup() {
    var _a;
    const inputs = await SCHEMA.validate({
        toolchain: (0, core_1.getInput)('toolchain'),
        target: (0, core_1.getInput)('target'),
        binstallVersion: (0, core_1.getInput)('binstall-version'),
        cosignVersion: (0, core_1.getInput)('cosign-version'),
        rekorVersion: (0, core_1.getInput)('rekor-version'),
        gitsignVersion: (0, core_1.getInput)('gitsign-version'),
        crossVersion: (0, core_1.getInput)('cross-version')
    });
    if (inputs.binstallVersion &&
        !(0, semver_1.satisfies)(inputs.binstallVersion, '>=0.20.0')) {
        throw new Error('binstall-version must be >=0.20.0');
    }
    if (inputs.cosignVersion && !(0, semver_1.satisfies)(inputs.cosignVersion, '>=1.13.0')) {
        throw new Error('cosign-version must be >=1.13.0');
    }
    if (inputs.rekorVersion && !(0, semver_1.satisfies)(inputs.rekorVersion, '>=1.0.0')) {
        throw new Error('rekor-version must be >=1.0.0');
    }
    if (inputs.gitsignVersion && !(0, semver_1.satisfies)(inputs.gitsignVersion, '>=0.4.0')) {
        throw new Error('gitsign-version must be >=1.0.0');
    }
    if (inputs.crossVersion && !(0, semver_1.satisfies)(inputs.crossVersion, '>=0.2.0')) {
        throw new Error('cross-version must be >=0.2.0');
    }
    return Object.assign(Object.assign({}, inputs), { toolchain: inputs.toolchain, target: (_a = inputs.target) !== null && _a !== void 0 ? _a : runnerHostTarget() });
}
exports.getSetup = getSetup;
