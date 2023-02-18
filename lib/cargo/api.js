"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVersionPublished = void 0;
const core_1 = require("@actions/core");
const crates_io_1 = require("crates.io");
const cratesIO = new crates_io_1.CratesIO();
async function isVersionPublished(packageName, version) {
    try {
        (0, core_1.debug)(`Looking up ${packageName} ${version} on crates.io`);
        await cratesIO.api.crates.getVersion(packageName, version);
        (0, core_1.debug)(`Found ${packageName} ${version} on crates.io`);
        return true;
    }
    catch (error) {
        (0, core_1.debug)(`Response from crates.io: ${error}`);
        (0, core_1.debug)(`Assuming we did not find ${packageName} ${version} on crates.io`);
        return false;
    }
}
exports.isVersionPublished = isVersionPublished;
