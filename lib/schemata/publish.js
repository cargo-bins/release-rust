"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublish = void 0;
const core_1 = require("@actions/core");
const yup_1 = require("yup");
const SCHEMA = (0, yup_1.object)({
    crate: (0, yup_1.boolean)().default(true).required(),
    crateOnly: (0, yup_1.boolean)().default(false).required(),
    allCrates: (0, yup_1.boolean)().default(false).required()
}).noUnknown();
async function getPublish() {
    return await SCHEMA.validate({
        crate: (0, core_1.getInput)('publish-crate'),
        crateOnly: (0, core_1.getInput)('publish-crate-only'),
        allCrates: (0, core_1.getInput)('publish-all-crates')
    });
}
exports.getPublish = getPublish;
