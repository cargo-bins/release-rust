"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInput = exports.newlineList = void 0;
const core_1 = require("@actions/core");
function newlineList(str) {
    return str
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('#'));
}
exports.newlineList = newlineList;
// behaves more in line with what yup expects
function getInput(name, options) {
    const input = (0, core_1.getInput)(name, options);
    if (input === '')
        return undefined;
    return input;
}
exports.getInput = getInput;
