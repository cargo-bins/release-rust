"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRelease = void 0;
const yup_1 = require("yup");
const common_1 = require("./common");
function isPatternMap(input) {
    return (true &&
        typeof input === 'object' &&
        input !== null &&
        !Array.isArray(input) &&
        Object.values(input).every(value => typeof value === 'string'));
}
function detectPatternMap(input) {
    try {
        const parsed = JSON.parse(input);
        if (isPatternMap(parsed)) {
            return parsed;
        }
    }
    catch (_) {
        // ignore
    }
    return { '*': input };
}
function isPatternListOrBoolean(input) {
    return (typeof input === 'boolean' ||
        (Array.isArray(input) &&
            input.every(value => typeof value === 'string')));
}
function parsePatternListOrBoolean(input) {
    if (/true/i.test(input)) {
        return true;
    }
    if (/false/i.test(input)) {
        return false;
    }
    return (0, common_1.newlineList)(input);
}
function isStringOrBoolean(input) {
    return typeof input === 'boolean' || typeof input === 'string';
}
function parseStringOrBoolean(input) {
    if (/true/i.test(input)) {
        return true;
    }
    if (/false/i.test(input)) {
        return false;
    }
    return input;
}
const SCHEMA = (0, yup_1.object)({
    enabled: (0, yup_1.boolean)().default(true).required(),
    name: (0, yup_1.object)()
        .transform(detectPatternMap)
        .default({ '*': '{crate-version}' })
        .required(),
    notes: (0, yup_1.object)().transform(detectPatternMap).default({ '*': '' }).required(),
    separately: (0, yup_1.boolean)().default(false).required(),
    latest: (0, yup_1.mixed)(isStringOrBoolean)
        .transform(parseStringOrBoolean)
        .default(true)
        .required(),
    pre: (0, yup_1.mixed)(isPatternListOrBoolean)
        .transform(parsePatternListOrBoolean)
        .default(false)
        .required()
}).noUnknown();
async function getRelease() {
    return await SCHEMA.validate({
        enabled: (0, common_1.getInput)('release'),
        name: (0, common_1.getInput)('release-name'),
        notes: (0, common_1.getInput)('release-notes'),
        separately: (0, common_1.getInput)('release-separately'),
        latest: (0, common_1.getInput)('release-latest'),
        pre: (0, common_1.getInput)('release-pre')
    });
}
exports.getRelease = getRelease;
