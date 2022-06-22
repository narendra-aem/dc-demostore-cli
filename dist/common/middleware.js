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
exports.contextHandler = exports.setupLogging = exports.createTempDir = exports.loginDC = void 0;
const logger_1 = __importStar(require("./logger"));
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const amplience_helper_1 = __importDefault(require("./amplience-helper"));
const lodash_1 = __importDefault(require("lodash"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = require("./prompts");
const http_status_codes_1 = require("http-status-codes");
const loginDC = (context) => __awaiter(void 0, void 0, void 0, function* () {
    context.amplienceHelper = (0, amplience_helper_1.default)(context);
    context.hub = yield context.amplienceHelper.login();
});
exports.loginDC = loginDC;
const createTempDir = (context) => {
    fs_extra_1.default.rmSync(context.tempDir, { recursive: true, force: true });
    fs_extra_1.default.mkdirpSync(context.tempDir);
    logger_1.default.info(`${prompts_1.prompts.created} temp dir: ${chalk_1.default.blue(context.tempDir)}`);
    (0, logger_1.setLogDirectory)(context.tempDir);
};
exports.createTempDir = createTempDir;
const setupLogging = (context) => {
    let _request = dc_management_sdk_js_1.AxiosHttpClient.prototype.request;
    dc_management_sdk_js_1.AxiosHttpClient.prototype.request = function (request) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let start = new Date();
                let startString = start.valueOf();
                let requestId = `${startString}-${request.method}-${(_b = (_a = request.url.split('/').pop()) === null || _a === void 0 ? void 0 : _a.split('?')) === null || _b === void 0 ? void 0 : _b[0]}`;
                let response = yield _request.call(this, request);
                let duration = new Date().valueOf() - start.valueOf();
                logger_1.default.debug(`[ ${startString} ] ${request.method} | ${request.url} | ${response.status} | ${http_status_codes_1.StatusCodes[response.status]} | ${duration}ms`);
                if (context.logRequests) {
                    let subDir = response.status > 400 ? `error` : `success`;
                    let requestLogDir = `${context.tempDir}/requests/${subDir}/${requestId}`;
                    fs_extra_1.default.mkdirpSync(requestLogDir);
                    fs_extra_1.default.writeJSONSync(`${requestLogDir}/request.json`, request);
                    fs_extra_1.default.writeJSONSync(`${requestLogDir}/response.json`, response);
                }
                return response;
            }
            catch (error) {
                logger_1.default.info(error);
                throw error;
            }
        });
    };
};
exports.setupLogging = setupLogging;
const contextHandler = (handler) => (context) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        yield handler(context);
    }
    catch (error) {
        console.log(error);
        logger_1.default.error(chalk_1.default.bold.red(error.message || error));
        lodash_1.default.each((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.errors, error => logger_1.default.error(`\t* ${chalk_1.default.bold.red(error.code)}: ${error.message}`));
        if (error.stack) {
            logger_1.default.error(error.stack);
        }
    }
    finally {
        (0, logger_1.logRunEnd)(context);
    }
});
exports.contextHandler = contextHandler;
