"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIJob = void 0;
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = __importStar(require("../common/logger"));
const child_process_1 = __importDefault(require("child_process"));
const stringio_1 = require("@rauschma/stringio");
const chalk_1 = __importDefault(require("chalk"));
const logger_2 = require("../common/logger");
const prompts_1 = require("../common/prompts");
class CLIJob {
    constructor(cmd) {
        this.reactions = {};
        this.cmd = cmd;
    }
    on(text, handler) {
        this.reactions[text] = handler;
    }
    exec() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            let startTime = new Date().valueOf();
            let child = child_process_1.default.exec(this.cmd);
            (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (message) => {
                lodash_1.default.each(message.split('\n'), line => {
                    if (line.length > 0) {
                        (0, logger_2.logUpdate)(`${line.trim()}`);
                        lodash_1.default.each(this.reactions, (reaction, trigger) => {
                            if (line.indexOf(trigger) > -1) {
                                reaction(line, child);
                            }
                        });
                    }
                });
            });
            (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (message) => {
                lodash_1.default.each(message.split('\n'), line => {
                    logger_1.default.error(`${line.trim()}`);
                });
            });
            yield (0, stringio_1.onExit)(child);
            let duration = new Date().valueOf() - startTime;
            (0, logger_1.logComplete)(`${prompts_1.prompts.done} in ${chalk_1.default.green(duration)} ms\n`);
        });
    }
}
exports.CLIJob = CLIJob;
