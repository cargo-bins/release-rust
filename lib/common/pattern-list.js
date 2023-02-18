"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternList = void 0;
const core_1 = require("@actions/core");
const minimatch_1 = require("minimatch");
const glob_1 = require("./glob");
class PatternList {
    constructor(patterns) {
        this.patterns = patterns.map(pattern => new minimatch_1.Minimatch(pattern, {
            debug: (0, core_1.isDebug)()
        }));
    }
    static fromString(patterns) {
        return new PatternList(patterns
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#')));
    }
    matchOne(value) {
        (0, core_1.debug)(`Matching: "${value}"`);
        return (this.patterns.some(pattern => pattern.match(value)) &&
            !this.patterns.some(pattern => pattern.negate && pattern.match(value)));
    }
    matchList(values) {
        return values.filter(value => this.matchOne(value));
    }
    matchListBy(values, fn) {
        return values.filter(value => this.matchOne(fn(value)));
    }
    async findFiles() {
        const files = [];
        for (const pattern of this.patterns) {
            if (pattern.negate)
                continue;
            (0, core_1.debug)(`Running glob: "${pattern.pattern}"`);
            files.push(...(await (0, glob_1.glob)(pattern.pattern)));
        }
        (0, core_1.debug)(`Re-filtering to remove negated patterns`);
        return this.matchList(files);
    }
}
exports.PatternList = PatternList;
