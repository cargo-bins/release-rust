"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extraFlags = void 0;
const shell_quote_1 = require("shell-quote");
const exec_1 = require("../common/exec");
function extraFlags(inputs, name, env = {}) {
    const extraFlags = (0, shell_quote_1.parse)(inputs.extras[name].join(' '), Object.assign(Object.assign({}, (0, exec_1.hookEnv)(inputs)), env));
    if (extraFlags.some(flag => typeof flag !== 'string')) {
        throw new Error(`${name} cannot contain shell operators`);
    }
    return extraFlags;
}
exports.extraFlags = extraFlags;
