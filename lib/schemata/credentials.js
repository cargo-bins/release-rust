"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCredentials = void 0;
const github_1 = require("@actions/github");
const yup_1 = require("yup");
const common_1 = require("./common");
const SCHEMA = (0, yup_1.object)({
    github: (0, yup_1.string)().required(),
    crates: (0, yup_1.string)().optional()
}).noUnknown();
async function getCredentials() {
    const inputs = await SCHEMA.validate({
        github: (0, common_1.getInput)('github-token', { required: true }),
        crates: (0, common_1.getInput)('crates-token')
    });
    return {
        githubToken: inputs.github,
        cratesToken: inputs.crates,
        github: (0, github_1.getOctokit)(inputs.github)
    };
}
exports.getCredentials = getCredentials;
