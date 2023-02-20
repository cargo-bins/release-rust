"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTag = exports.SCHEMA = void 0;
const yup_1 = require("yup");
const common_1 = require("./common");
exports.SCHEMA = (0, yup_1.object)({
    name: (0, yup_1.string)().min(1).default('false').required(),
    crates: (0, yup_1.boolean)().default(true).required(),
    sign: (0, yup_1.boolean)().default(true).required()
}).noUnknown();
async function getTag() {
    var _a;
    const inputs = await exports.SCHEMA.validate({
        name: (_a = (0, common_1.getInput)('tag')) !== null && _a !== void 0 ? _a : 'true',
        crates: (0, common_1.getInput)('tag-crates'),
        sign: (0, common_1.getInput)('tag-sign')
    });
    const enabled = inputs.name !== 'false';
    return {
        enabled,
        name: inputs.name === 'false' ? undefined : inputs.name,
        crates: enabled && inputs.crates,
        sign: enabled && inputs.sign
    };
}
exports.getTag = getTag;
