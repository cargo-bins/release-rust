"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtras = void 0;
const yup_1 = require("yup");
const common_1 = require("./common");
const SCHEMA = (0, yup_1.object)({
    rustupComponents: (0, yup_1.array)()
        .of((0, yup_1.string)().min(1).required())
        .transform(common_1.newlineList)
        .default([])
        .required(),
    cargoFlags: (0, yup_1.array)()
        .of((0, yup_1.string)().min(1).required())
        .transform(common_1.newlineList)
        .default([])
        .required(),
    rustcFlags: (0, yup_1.array)()
        .of((0, yup_1.string)().min(1).required())
        .transform(common_1.newlineList)
        .default([])
        .required(),
    cosignFlags: (0, yup_1.array)()
        .of((0, yup_1.string)().min(1).required())
        .transform(common_1.newlineList)
        .default([])
        .required()
}).noUnknown();
async function getExtras() {
    return await SCHEMA.validate({
        rustupComponents: (0, common_1.getInput)('extra-rustup-components'),
        cargoFlags: (0, common_1.getInput)('extra-cargo-flags'),
        rustcFlags: (0, common_1.getInput)('extra-rustc-flags'),
        cosignFlags: (0, common_1.getInput)('extra-cosign-flags')
    });
}
exports.getExtras = getExtras;
