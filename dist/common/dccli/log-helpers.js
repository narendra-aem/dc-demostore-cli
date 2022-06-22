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
exports.openRevertLog = exports.createLog = exports.getDefaultLogPath = void 0;
const path_1 = require("path");
const archive_log_1 = require("./archive-log");
const file_log_1 = require("./file-log");
function getDefaultLogPath(type, action, platform = process.platform) {
    return (0, path_1.join)(process.env[platform == 'win32' ? 'USERPROFILE' : 'HOME'] || __dirname, '.amplience', `logs/${type}-${action}-<DATE>.log`);
}
exports.getDefaultLogPath = getDefaultLogPath;
function createLog(logFile, title) {
    const log = new file_log_1.FileLog(logFile);
    if (title !== undefined) {
        const timestamp = Date.now().toString();
        log.title = (0, file_log_1.versionedTitle)(`${title} - ${timestamp}\n`);
    }
    return log;
}
exports.createLog = createLog;
function openRevertLog(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        if (filename == null) {
            return undefined;
        }
        const log = new file_log_1.FileLog();
        try {
            yield log.loadFromFile(filename);
        }
        catch (_a) {
            log.errorLevel = archive_log_1.LogErrorLevel.INVALID;
        }
        return log;
    });
}
exports.openRevertLog = openRevertLog;
