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
exports.contextHandler = exports.setupLogging = exports.loginDAM = exports.loginDC = exports.instrumentHub = void 0;
const logger_1 = __importStar(require("./logger"));
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const dam_service_1 = require("../dam/dam-service");
const amplience_helper_1 = __importDefault(require("./amplience-helper"));
const lodash_1 = __importDefault(require("lodash"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = require("./prompts");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const typed_result_1 = require("../handlers/typed-result");
const http_status_codes_1 = require("http-status-codes");
const instrumentHub = (hub) => {
    let listeners = [];
    const instrument = (object, name) => {
        lodash_1.default.each(object, (fn, op) => {
            object[op] = (args) => __awaiter(void 0, void 0, void 0, function* () {
                let { duration, result } = yield (0, typed_result_1.timed)(`${name} ${op}`, () => __awaiter(void 0, void 0, void 0, function* () {
                    let page = yield fn.call(object, args);
                    if (page instanceof dc_management_sdk_js_1.Page) {
                        lodash_1.default.each(page.getItems(), resource => {
                            lodash_1.default.each(resource.related, instrument);
                        });
                    }
                    return page;
                }));
                lodash_1.default.each(listeners, l => l({
                    element: name,
                    operation: op,
                    duration,
                    result
                }));
                return result;
            });
        });
    };
    lodash_1.default.each(hub.related, instrument);
    hub.on = (fn) => { listeners.push(fn); };
    hub.contentItemIterator = (fn, opts = { status: dc_management_sdk_js_1.Status.ACTIVE }) => __awaiter(void 0, void 0, void 0, function* () {
        yield Promise.all((yield (0, dc_demostore_integration_1.paginator)(hub.related.contentRepositories.list)).map((repo) => __awaiter(void 0, void 0, void 0, function* () {
            yield Promise.all((yield (0, dc_demostore_integration_1.paginator)(repo.related.contentItems.list, opts)).map(fn));
        })));
    });
    return hub;
};
exports.instrumentHub = instrumentHub;
const loginDC = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let client = new dc_management_sdk_js_1.DynamicContent({
        client_id: context.environment.dc.clientId,
        client_secret: context.environment.dc.clientSecret
    });
    try {
        context.hub = (0, exports.instrumentHub)(yield client.hubs.get(context.environment.dc.hubId));
    }
    catch (error) {
        throw new Error(`Error logging in to hub [ ${context.environment.dc.hubId} ]: ${error}`);
    }
    context.hub.on((result) => {
        logger_1.default.debug(`[ hub ] ${result.element} ${result.operation} ${result.duration} ms`);
    });
    let repositories = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.contentRepositories.list);
    context.hub.repositories = lodash_1.default.keyBy(repositories, 'name');
    context.hub.repositoryIdMap = lodash_1.default.zipObject(lodash_1.default.map(repositories, r => r.name), lodash_1.default.map(repositories, 'id'));
    let workflowStates = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.workflowStates.list);
    context.hub.workflowStatesMap = lodash_1.default.zipObject(lodash_1.default.map(workflowStates, ws => lodash_1.default.camelCase(ws.label)), lodash_1.default.map(workflowStates, 'id'));
    if (!context.hub) {
        throw new Error(`hubId not found: ${context.environment.dc.hubId}`);
    }
    else {
        logger_1.default.info(`connected to hub ${chalk_1.default.bold.cyan(`[ ${context.hub.name} ]`)}`);
    }
    yield amplience_helper_1.default.login(context);
});
exports.loginDC = loginDC;
const loginDAM = (context) => __awaiter(void 0, void 0, void 0, function* () {
    context.damService = new dam_service_1.DAMService();
    yield context.damService.init(context.environment.dam);
    logger_1.default.info(`connected to dam with user ${chalk_1.default.cyanBright(`[ ${context.environment.dam.username} ]`)}`);
});
exports.loginDAM = loginDAM;
const setupLogging = (context) => {
    (0, logger_1.setLogDirectory)(context.tempDir);
    fs_extra_1.default.rmSync(context.tempDir, { recursive: true, force: true });
    fs_extra_1.default.mkdirpSync(context.tempDir);
    logger_1.default.info(`${prompts_1.prompts.created} temp dir: ${chalk_1.default.blue(context.tempDir)}`);
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
exports.default = {
    loginDAM: exports.loginDAM,
    loginDC: exports.loginDC,
    contextHandler: exports.contextHandler
};
