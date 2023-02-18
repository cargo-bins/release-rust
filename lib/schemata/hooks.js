"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHooks = void 0;
const core_1 = require("@actions/core");
const yup_1 = require("yup");
const SCHEMA = (0, yup_1.object)({
    postSetup: (0, yup_1.string)(),
    postPublish: (0, yup_1.string)(),
    customBuild: (0, yup_1.string)(),
    postBuild: (0, yup_1.string)(),
    prePackage: (0, yup_1.string)(),
    postPackage: (0, yup_1.string)(),
    postSign: (0, yup_1.string)(),
    postRelease: (0, yup_1.string)(),
    shell: (0, yup_1.string)().default('bash').required()
}).noUnknown();
async function getHooks() {
    return await SCHEMA.validate({
        postSetup: (0, core_1.getInput)('post-setup'),
        postPublish: (0, core_1.getInput)('post-publish'),
        customBuild: (0, core_1.getInput)('custom-build'),
        postBuild: (0, core_1.getInput)('post-build'),
        prePackage: (0, core_1.getInput)('pre-package'),
        postPackage: (0, core_1.getInput)('post-package'),
        postSign: (0, core_1.getInput)('post-sign'),
        postRelease: (0, core_1.getInput)('post-release'),
        shell: (0, core_1.getInput)('shell')
    });
}
exports.getHooks = getHooks;
