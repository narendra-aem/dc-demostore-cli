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
exports.ArchiveLog = exports.LogErrorLevel = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const logger_1 = require("../logger");
const directory_utils_1 = require("./directory-utils");
var LogErrorLevel;
(function (LogErrorLevel) {
    LogErrorLevel[LogErrorLevel["NONE"] = 0] = "NONE";
    LogErrorLevel[LogErrorLevel["WARNING"] = 1] = "WARNING";
    LogErrorLevel[LogErrorLevel["ERROR"] = 2] = "ERROR";
    LogErrorLevel[LogErrorLevel["INVALID"] = 3] = "INVALID";
})(LogErrorLevel = exports.LogErrorLevel || (exports.LogErrorLevel = {}));
class ArchiveLog {
    constructor(title) {
        this.title = title;
        this.errorLevel = LogErrorLevel.NONE;
        this.items = new Map([['_default', []]]);
        this.accessGroup = this.items.get('_default');
    }
    loadFromFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const log = yield (0, util_1.promisify)(fs_1.readFile)(path, 'utf8');
            const logLines = log.split('\n');
            this.switchGroup('_default');
            logLines.forEach((line, index) => {
                if (line.startsWith('//')) {
                    const message = line.substring(2).trimLeft();
                    if (this.title == null) {
                        this.title = message;
                    }
                    else {
                        this.addComment(message);
                    }
                    return;
                }
                else if (line.startsWith('> ')) {
                    this.switchGroup(line.substring(2));
                    return;
                }
                if (index === logLines.length - 1) {
                    this.errorLevel = this.parseResultCode(line);
                }
                else {
                    const lineSplit = line.split(' ');
                    if (lineSplit.length >= 2) {
                        this.addAction(lineSplit[0], lineSplit.slice(1).join(' '));
                    }
                }
            });
            this.switchGroup('_default');
            return this;
        });
    }
    getResultCode() {
        switch (this.errorLevel) {
            case LogErrorLevel.NONE:
                return 'SUCCESS';
            case LogErrorLevel.ERROR:
                return 'FAILURE';
            default:
                return LogErrorLevel[this.errorLevel];
        }
    }
    parseResultCode(code) {
        switch (code) {
            case 'SUCCESS':
                return LogErrorLevel.NONE;
            case 'FAILURE':
                return LogErrorLevel.ERROR;
            default:
                return LogErrorLevel[code] || LogErrorLevel.NONE;
        }
    }
    writeToFile(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let log = `// ${this.title}\n`;
                this.items.forEach((group, groupName) => {
                    if (groupName !== '_default') {
                        log += `> ${groupName}\n`;
                    }
                    group.forEach(item => {
                        if (item.comment) {
                            log += `// ${item.data}\n`;
                        }
                        else {
                            log += `${item.action} ${item.data}\n`;
                        }
                    });
                });
                log += this.getResultCode();
                const dir = (0, path_1.dirname)(path);
                yield (0, directory_utils_1.ensureDirectoryExists)(dir);
                yield (0, util_1.promisify)(fs_1.writeFile)(path, log);
                (0, logger_1.logUpdate)(`Log written to "${path}".`);
                return true;
            }
            catch (_a) {
                console.log('Could not write log.');
                return false;
            }
        });
    }
    addError(level, message, error) {
        if (level > this.errorLevel) {
            this.errorLevel = level;
        }
        this.addAction(LogErrorLevel[level], '');
        this.addComment(LogErrorLevel[level] + ': ' + message);
        const errorLog = level == LogErrorLevel.ERROR ? console.error : console.warn;
        errorLog(LogErrorLevel[level] + ': ' + message);
        if (error) {
            this.addComment(error.toString());
            errorLog(error.toString());
        }
    }
    warn(message, error) {
        this.addError(LogErrorLevel.WARNING, message, error);
    }
    error(message, error) {
        this.addError(LogErrorLevel.ERROR, message, error);
    }
    switchGroup(group) {
        let targetGroup = this.items.get(group);
        if (!targetGroup) {
            targetGroup = [];
            this.items.set(group, targetGroup);
        }
        this.accessGroup = targetGroup;
    }
    addComment(comment) {
        const lines = comment.split('\n');
        lines.forEach(line => {
            this.accessGroup.push({ comment: true, data: line });
        });
    }
    addAction(action, data) {
        this.accessGroup.push({ comment: false, action: action, data: data });
    }
    getData(action, group = '_default') {
        const items = this.items.get(group);
        if (!items) {
            throw new Error(`Group ${group} was missing from the log file.`);
        }
        return items.filter(item => !item.comment && item.action === action).map(item => item.data);
    }
}
exports.ArchiveLog = ArchiveLog;
