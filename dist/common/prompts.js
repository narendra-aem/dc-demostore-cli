"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prompts = void 0;
const chalk_1 = __importDefault(require("chalk"));
exports.prompts = {
    create: chalk_1.default.green('create'),
    created: chalk_1.default.green.bold('created'),
    import: chalk_1.default.green('import'),
    update: chalk_1.default.green('update'),
    unarchive: chalk_1.default.yellow('unarchive'),
    sync: chalk_1.default.blue('sync'),
    imported: chalk_1.default.greenBright('imported'),
    done: chalk_1.default.bold.greenBright('done'),
    delete: chalk_1.default.red('delete'),
    deleted: chalk_1.default.bold.red('deleted'),
    archive: chalk_1.default.yellowBright('archive'),
    archived: chalk_1.default.bold.yellowBright('archived'),
    assign: chalk_1.default.blue('assign'),
    unassign: chalk_1.default.red('unassign'),
    unschedule: chalk_1.default.red('unschedule'),
    error: chalk_1.default.redBright('error'),
};
