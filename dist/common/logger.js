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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeEnd = exports.time = exports.logRunEnd = exports.logComplete = exports.logUpdate = exports.logSubheading = exports.logHeadline = exports.setLogDirectory = void 0;
const winston_1 = __importStar(require("winston"));
const chalk_1 = __importDefault(require("chalk"));
const transports_1 = require("winston/lib/winston/transports");
const decolorizeString = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
const decolorize = (0, winston_1.format)((info, opts) => (Object.assign(Object.assign({}, info), { message: info.message && decolorizeString(info.message) })));
let _log = transports_1.Console.prototype.log;
transports_1.Console.prototype.log = function (info, callback) {
    if (process.env.NODE_ENV !== 'production') {
        _log.call(this, info, callback);
    }
};
const getLogger = (dir) => {
    return winston_1.default.createLogger({
        level: 'info',
        format: winston_1.format.simple(),
        transports: [
            new winston_1.default.transports.File({
                filename: `${dir}/error.log`,
                level: 'error',
                format: winston_1.format.combine(decolorize(), winston_1.format.simple())
            }),
            new winston_1.default.transports.File({
                filename: `${dir}/combined.log`,
                level: 'debug',
                format: winston_1.format.combine(decolorize(), winston_1.format.simple())
            }),
            new winston_1.default.transports.Console({
                format: winston_1.default.format.simple(),
            })
        ]
    });
};
let logger = getLogger('');
const setLogDirectory = (dir) => {
    logger = getLogger(dir);
};
exports.setLogDirectory = setLogDirectory;
const logHeadline = (headline) => {
    logger.info('');
    logger.info('---------------------------------------------------');
    logger.info(chalk_1.default.green.bold(headline));
    logger.info('---------------------------------------------------');
    logger.info('');
};
exports.logHeadline = logHeadline;
const logSubheading = (headline) => {
    logger.info('');
    logger.info(chalk_1.default.cyan.bold(headline));
    logger.info('');
};
exports.logSubheading = logSubheading;
let lineLength = process.stdout.columns - 6;
const logUpdate = (message, logToFile = true) => {
    if (logToFile) {
        logger.debug(message);
    }
    if (logger.level !== 'debug') {
        message = message.substring(0, lineLength);
        let numSpaces = lineLength - decolorizeString(message).length;
        process.stdout.write(`\r\r${chalk_1.default.bgWhite.black.bold('exec')}  ${message}${' '.repeat(numSpaces)}`);
    }
};
exports.logUpdate = logUpdate;
const logComplete = (message) => {
    if (logger.level !== 'debug') {
        process.stdout.write(`\r\r${' '.repeat(lineLength)}`);
        process.stdout.write(`\r\r`);
    }
    logger.info(message);
};
exports.logComplete = logComplete;
const logRunEnd = (context) => {
    let duration = new Date().valueOf() - context.startTime.valueOf();
    let minutes = Math.floor((duration / 1000) / 60);
    let seconds = Math.floor((duration / 1000) - (minutes * 60));
    logger.info(`logs and temp files stored in ${chalk_1.default.blueBright(context.tempDir)}`);
    logger.info(`run completed in [ ${chalk_1.default.green(`${minutes}m${seconds}s`)} ]`);
    process.exit(0);
};
exports.logRunEnd = logRunEnd;
let timers = {};
const time = (key) => {
    timers[key] = new Date();
};
exports.time = time;
const timeEnd = (key) => {
    let end = new Date().valueOf() - timers[key].valueOf();
    logger.info(`${key} took ${end}ms`);
};
exports.timeEnd = timeEnd;
exports.default = logger;
