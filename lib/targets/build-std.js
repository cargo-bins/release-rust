"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStdEnabled = void 0;
const toolchain_1 = require("../common/toolchain");
const BUILD_STD_TARGETS = [
    // macOS
    'x86_64-apple-darwin',
    'aarch64-apple-darwin',
    // Linux GNU
    'x86_64-unknown-linux-gnu',
    'armv7-unknown-linux-gnueabihf',
    'aarch64-unknown-linux-gnu',
    // Linux musl
    'x86_64-unknown-linux-musl',
    'armv7-unknown-linux-musleabihf',
    'aarch64-unknown-linux-musl',
    // Windows
    'x86_64-pc-windows-msvc',
    'aarch64-pc-windows-msvc'
];
const BUILD_STD_MINIMUM_NIGHTLY = new Date('2020-01-01');
function buildStdEnabled(inputs) {
    var _a;
    if (((_a = (0, toolchain_1.nightlyDate)(inputs.setup.toolchain)) !== null && _a !== void 0 ? _a : new Date(0)) <
        BUILD_STD_MINIMUM_NIGHTLY) {
        return false;
    }
    if (!BUILD_STD_TARGETS.includes(inputs.setup.target)) {
        return false;
    }
    return inputs.build.buildstd;
}
exports.buildStdEnabled = buildStdEnabled;
