"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cargoPublish = void 0;
const core_1 = require("@actions/core");
const exec_1 = require("../common/exec");
async function cargoPublish(crate) {
    (0, core_1.info)(`Publishing ${crate}`);
    await (0, exec_1.execAndSucceed)('cargo', ['publish', '--package', crate]);
}
exports.cargoPublish = cargoPublish;
