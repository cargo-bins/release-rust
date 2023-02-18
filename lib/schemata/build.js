"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBuild = void 0;
const core_1 = require("@actions/core");
const yup_1 = require("yup");
const common_1 = require("./common");
const SCHEMA = (0, yup_1.object)({
    crates: (0, yup_1.array)()
        .of((0, yup_1.string)().min(1).required())
        .transform(common_1.newlineList)
        .default(['*'])
        .min(1)
        .required(),
    features: (0, yup_1.array)()
        .of((0, yup_1.string)().min(1).required())
        .transform(common_1.newlineList)
        .default([])
        .required(),
    buildstd: (0, yup_1.boolean)().default(true).required(),
    debuginfo: (0, yup_1.boolean)().default(true).required(),
    muslLibGcc: (0, yup_1.boolean)().default(true).required(),
    crtStatic: (0, yup_1.boolean)(),
    useCross: (0, yup_1.boolean)()
}).noUnknown();
async function getBuild() {
    return await SCHEMA.validate({
        crates: (0, core_1.getInput)('crates'),
        features: (0, core_1.getInput)('features'),
        buildstd: (0, core_1.getInput)('buildstd'),
        debuginfo: (0, core_1.getInput)('debuginfo'),
        muslLibGcc: (0, core_1.getInput)('musl-libgcc'),
        crtStatic: (0, core_1.getInput)('crt-static'),
        useCross: (0, core_1.getInput)('use-cross')
    });
}
exports.getBuild = getBuild;
