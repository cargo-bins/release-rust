"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDebugSymbols = exports.isArtifactMessage = exports.parseOutput = void 0;
const node_path_1 = require("node:path");
const glob_1 = require("../common/glob");
function parseOutput(output) {
    return output
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length)
        .map(line => JSON.parse(line));
}
exports.parseOutput = parseOutput;
function isArtifactMessage(message) {
    return message.reason === 'compiler-artifact';
}
exports.isArtifactMessage = isArtifactMessage;
async function findDebugSymbols(filenames) {
    for (const filename of filenames) {
        const dir = (0, node_path_1.dirname)(filename);
        filenames.push(...(await (0, glob_1.glob)(`${dir}/@(*.dSYM|*.pdb|*.dwp)`)));
    }
}
exports.findDebugSymbols = findDebugSymbols;
