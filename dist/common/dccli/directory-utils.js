"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDirectoryExists = void 0;
const util_1 = require("util");
const fs_1 = require("fs");
const path_1 = require("path");
function ensureDirectoryExists(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield (0, util_1.promisify)(fs_1.exists)(dir)) {
            const dirStat = yield (0, util_1.promisify)(fs_1.lstat)(dir);
            if (!dirStat || !dirStat.isDirectory()) {
                throw new Error(`"${dir}" already exists and is not a directory.`);
            }
        }
        else {
            const parentPath = dir.split(path_1.sep);
            parentPath.pop();
            const parent = parentPath.join(path_1.sep);
            if (parentPath.length > 0) {
                yield ensureDirectoryExists(parent);
            }
            if (dir.length > 0) {
                try {
                    yield (0, util_1.promisify)(fs_1.mkdir)(dir);
                }
                catch (e) {
                    if (yield (0, util_1.promisify)(fs_1.exists)(dir)) {
                        return;
                    }
                    throw new Error(`Unable to create directory: "${dir}".`);
                }
            }
        }
    });
}
exports.ensureDirectoryExists = ensureDirectoryExists;
