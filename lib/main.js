"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const schemata_1 = __importDefault(require("./schemata"));
const phase = __importStar(require("./phases"));
const build_std_1 = require("./targets/build-std");
(async () => {
    try {
        const inputs = await (0, schemata_1.default)();
        (0, core_1.debug)(`inputs: ${JSON.stringify(inputs)}`);
        const newBuildStd = (0, build_std_1.buildStdEnabled)(inputs);
        if (inputs.build.buildstd !== newBuildStd) {
            (0, core_1.debug)(`Given ${Object.entries({
                buildstd: inputs.build.buildstd,
                toolchain: inputs.setup.toolchain,
                target: inputs.setup.target
            })
                .map(([k, v]) => `${k}=${v}`)
                .join(',')}, overriding buildstd to ${newBuildStd}`);
            inputs.build.buildstd = newBuildStd;
        }
        (0, core_1.debug)('SETUP PHASE');
        await phase.setup(inputs);
        (0, core_1.debug)('PUBLISH PHASE');
        const { released, published, release } = await phase.publish(inputs);
        if (inputs.publish.crateOnly) {
            (0, core_1.debug)('publish-crate-only is on, we are DONE!');
            return;
        }
        (0, core_1.debug)('BUILD PHASE');
        const buildOutput = await phase.build(inputs, released);
        (0, core_1.debug)('PACKAGE PHASE');
        await phase.package(inputs, released, release, buildOutput);
        (0, core_1.debug)('SIGN PHASE');
        await phase.sign(inputs);
        (0, core_1.debug)('TAG PHASE');
        const tagged = await phase.tag(inputs, release, published);
        (0, core_1.debug)('RELEASE PHASE');
        await phase.release(inputs, release, tagged);
        (0, core_1.debug)('DONE');
        return;
    }
    catch (error) {
        if (error instanceof Error)
            (0, core_1.setFailed)(error.message);
        else if (typeof error === 'string')
            (0, core_1.setFailed)(error);
        else
            (0, core_1.setFailed)('An unknown error has occurred');
    }
})();
