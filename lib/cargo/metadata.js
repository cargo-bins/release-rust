"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoMetadata = void 0;
const exec_1 = require("../common/exec");
async function cargoMetadata() {
    const { stdout: json } = await (0, exec_1.execAndSucceedWithOutput)('cargo', [
        'metadata',
        '--format-version',
        '1'
    ]);
    return JSON.parse(json);
}
exports.cargoMetadata = cargoMetadata;
