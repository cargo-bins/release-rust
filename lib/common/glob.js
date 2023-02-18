"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.glob = void 0;
const glob_1 = __importDefault(require("glob"));
async function glob(pattern, options = {}) {
    return new Promise((resolve, reject) => {
        (0, glob_1.default)(pattern, options, (error, matches) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(matches);
            }
        });
    });
}
exports.glob = glob;
