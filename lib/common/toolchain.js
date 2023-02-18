"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nightlyDate = void 0;
function nightlyDate(toolchain) {
    if (toolchain === 'stable' || /1[.]\d+[.]\d+/.test(toolchain)) {
        return null;
    }
    if (toolchain === 'nightly') {
        return new Date();
    }
    const match = toolchain.match(/nightly-(\d{4}-\d{2}-\d{2})/);
    if (match) {
        return new Date(match[1]);
    }
    throw new Error(`Invalid toolchain: ${toolchain}`);
}
exports.nightlyDate = nightlyDate;
