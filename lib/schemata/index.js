"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const credentials_1 = require("./credentials");
const setup_1 = require("./setup");
const build_1 = require("./build");
const extras_1 = require("./extras");
const package_1 = require("./package");
const publish_1 = require("./publish");
const tag_1 = require("./tag");
const release_1 = require("./release");
const hooks_1 = require("./hooks");
async function getInputs() {
    (0, core_1.debug)('validating inputs');
    const inputs = {
        credentials: await (0, credentials_1.getCredentials)(),
        setup: await (0, setup_1.getSetup)(),
        build: await (0, build_1.getBuild)(),
        extras: await (0, extras_1.getExtras)(),
        package: await (0, package_1.getPackage)(),
        publish: await (0, publish_1.getPublish)(),
        tag: await (0, tag_1.getTag)(),
        release: await (0, release_1.getRelease)(),
        hooks: await (0, hooks_1.getHooks)()
    };
    (0, core_1.debug)(`inputs: ${JSON.stringify(inputs)}`);
    return inputs;
}
exports.default = getInputs;
