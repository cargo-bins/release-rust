"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newlineList = void 0;
function newlineList(str) {
    return str
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('#'));
}
exports.newlineList = newlineList;
