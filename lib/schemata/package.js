"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackage = void 0;
const node_path_1 = require("node:path");
const yup_1 = require("yup");
const common_1 = require("./common");
const SCHEMA = (0, yup_1.object)({
    archive: (0, yup_1.string)()
        .oneOf(['none', 'zip', 'tar+gzip', 'tar+bzip2', 'tar+xz', 'tar+zstd'])
        .default('zip')
        .required(),
    files: (0, yup_1.array)()
        .of((0, yup_1.string)().min(1).required())
        .transform(common_1.newlineList)
        .default([])
        .required(),
    name: (0, yup_1.string)()
        .min(1)
        .when('separately', {
        is: true,
        then: schema => schema.default('{crate-name}-{target}'),
        otherwise: schema => schema.default('{release-name}-{target}')
    })
        .required(),
    inDir: (0, yup_1.boolean)().default(true).required(),
    separately: (0, yup_1.boolean)().default(false).required(),
    shortExt: (0, yup_1.boolean)().default(false).required(),
    output: (0, yup_1.string)().default('packages/').required(),
    sign: (0, yup_1.boolean)().default(true).required()
}).noUnknown();
async function getPackage() {
    const inputs = await SCHEMA.validate({
        archive: (0, common_1.getInput)('package-archive'),
        files: (0, common_1.getInput)('package-files'),
        name: (0, common_1.getInput)('package-name'),
        inDir: (0, common_1.getInput)('package-in-dir'),
        separately: (0, common_1.getInput)('package-separately'),
        shortExt: (0, common_1.getInput)('package-short-ext'),
        output: (0, common_1.getInput)('package-output'),
        sign: (0, common_1.getInput)('package-sign')
    });
    return Object.assign(Object.assign({}, inputs), { output: (0, node_path_1.join)(process.cwd(), inputs.output) });
}
exports.getPackage = getPackage;
