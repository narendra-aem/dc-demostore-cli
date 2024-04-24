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
exports.FileLog = exports.versionedTitle = exports.setVersion = void 0;
const archive_log_1 = require("./archive-log");
let version = require('../../../package.json').version;
function setVersion(newVersion) {
    version = newVersion;
}
exports.setVersion = setVersion;
function versionedTitle(title) {
    return `dc-cli ${version} - ${title}`;
}
exports.versionedTitle = versionedTitle;
function buildTitle(filename) {
    if (filename) {
        return versionedTitle(filename.replace('<DATE>', Date.now().toString()));
    }
    else {
        return '';
    }
}
class FileLog extends archive_log_1.ArchiveLog {
    constructor(filename) {
        super(buildTitle(filename));
        this.filename = filename;
        this.openedCount = 0;
        if (this.filename != null) {
            const timestamp = Date.now().toString();
            this.filename = this.filename.replace('<DATE>', timestamp);
        }
    }
    appendLine(text = 'undefined', silent = false) {
        if (!silent) {
            process.stdout.write(text + '\n');
        }
        this.addComment(text);
    }
    open() {
        this.openedCount++;
        return this;
    }
    close() {
        return __awaiter(this, arguments, void 0, function* (writeIfClosed = true) {
            if (--this.openedCount <= 0) {
                if (this.filename != null && writeIfClosed) {
                    yield this.writeToFile(this.filename);
                }
                this.closed = true;
            }
        });
    }
}
exports.FileLog = FileLog;
