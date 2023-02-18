"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const core_1 = require("@actions/core");
const exec_1 = require("../common/exec");
const glob_1 = require("../common/glob");
const flags_1 = require("../common/flags");
async function signPhase(inputs) {
    if (inputs.package.sign) {
        const outputs = await (0, glob_1.glob)((0, node_path_1.join)(inputs.package.output, '*'));
        (0, core_1.info)(`Found ${outputs.length} outputs to sign: ${outputs.join(', ')}`);
        for (const output of outputs) {
            try {
                await signOutput(inputs, output);
            }
            catch (err) {
                (0, core_1.error)(`Failed to sign ${output}: ${err}, skipping`);
            }
        }
    }
    else {
        (0, core_1.info)('Skipping signing');
    }
    await (0, exec_1.runHook)(inputs, 'post-sign', {}, inputs.package.output);
}
exports.default = signPhase;
async function signOutput(inputs, output) {
    (0, core_1.info)(`Signing ${output} with cosign`);
    await (0, exec_1.execAndSucceed)('cosign', [
        'sign-blob',
        '--yes',
        ...(0, flags_1.extraFlags)(inputs, 'cosignFlags', {
            OUTPUT: output
        }),
        output
    ], {
        env: {
            COSIGN_EXPERIMENTAL: '1'
        }
    });
}
