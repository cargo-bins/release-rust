"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCredentials = void 0;
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const yup_1 = require("yup");
const SCHEMA = (0, yup_1.object)({
    github: (0, yup_1.string)().required(),
    crates: (0, yup_1.string)().optional()
}).noUnknown();
async function getCredentials() {
    const inputs = await SCHEMA.validate({
        github: (0, core_1.getInput)('github-token'),
        crates: (0, core_1.getInput)('crates-token')
    });
    return {
        githubToken: inputs.github,
        cratesToken: inputs.crates,
        github: (0, github_1.getOctokit)(inputs.github)
    };
}
exports.getCredentials = getCredentials;
