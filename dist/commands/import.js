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
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const lodash_1 = __importDefault(require("lodash"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importStar(require("../common/logger"));
const content_type_schema_handler_1 = require("../handlers/content-type-schema-handler");
const content_type_handler_1 = require("../handlers/content-type-handler");
const typed_result_1 = require("../handlers/typed-result");
const content_item_handler_1 = require("../handlers/content-item-handler");
const extension_handler_1 = require("../handlers/extension-handler");
const search_index_handler_1 = require("../handlers/search-index-handler");
const settings_handler_1 = require("../handlers/settings-handler");
const amplience_helper_1 = __importStar(require("../common/amplience-helper"));
const import_helper_1 = require("../helpers/import-helper");
const middleware_1 = require("../common/middleware");
const amplience_builder_1 = __importDefault(require("../common/amplience-builder"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const environment_manager_1 = require("../common/environment-manager");
const axios_1 = __importDefault(require("axios"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const utils_1 = require("../common/utils");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
exports.command = 'import';
exports.desc = "Import hub data";
const automationDirPath = `${environment_manager_1.CONFIG_PATH}/dc-demostore-automation`;
const downloadZip = (branch) => __awaiter(void 0, void 0, void 0, function* () {
    let url = `https://github.com/amplience/dc-demostore-automation/archive/refs/heads/${branch}.zip`;
    logger_1.default.info(`downloading latest automation files to ${chalk_1.default.blue(automationDirPath)}...`);
    logger_1.default.info(`\t${chalk_1.default.green(url)}`);
    const response = yield (0, axios_1.default)({
        method: 'GET',
        url,
        responseType: 'stream'
    });
    const zipFilePath = `${environment_manager_1.CONFIG_PATH}/${branch}.zip`;
    response.data.pipe(fs_extra_1.default.createWriteStream(zipFilePath));
    return new Promise((resolve, reject) => {
        response.data.on('end', () => __awaiter(void 0, void 0, void 0, function* () {
            logger_1.default.info(`download successful, unzipping...`);
            yield (0, utils_1.sleep)(1000);
            let zip = new adm_zip_1.default(zipFilePath);
            zip.extractAllTo(environment_manager_1.CONFIG_PATH);
            fs_extra_1.default.moveSync(`${environment_manager_1.CONFIG_PATH}/dc-demostore-automation-${branch}`, automationDirPath);
            fs_extra_1.default.rmSync(zipFilePath);
            resolve();
        }));
        response.data.on('error', () => {
            reject();
        });
    });
});
const builder = (yargs) => {
    return (0, amplience_builder_1.default)(yargs).options({
        automationDir: {
            alias: 'a',
            describe: 'path to automation directory',
            default: automationDirPath
        },
        skipContentImport: {
            alias: 's',
            describe: 'skip content import',
            type: 'boolean'
        },
        latest: {
            alias: 'l',
            describe: 'use latest automation files',
            type: 'boolean'
        },
        branch: {
            alias: 'b',
            describe: 'branch of dc-demostore-automation to use',
            type: 'string',
            default: 'main'
        }
    }).middleware([
        middleware_1.loginDAM,
        (context) => __awaiter(void 0, void 0, void 0, function* () {
            if (context.latest) {
                yield fs_extra_1.default.rm(automationDirPath, { recursive: true, force: true });
            }
            if (!fs_extra_1.default.existsSync(automationDirPath)) {
                yield downloadZip(context.branch);
            }
        })
    ]);
};
exports.builder = builder;
exports.handler = (0, middleware_1.contextHandler)((context) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.default.info(`${chalk_1.default.green(exports.command)}: ${exports.desc} started at ${chalk_1.default.magentaBright(context.startTime)}`);
    (0, logger_1.logHeadline)(`Phase 1: preparation`);
    context.mapping = Object.assign(Object.assign({}, context.mapping), { url: context.environment.url });
    yield (0, import_helper_1.copyTemplateFilesToTempDir)(context);
    yield (0, typed_result_1.timed)('content-type-schema import', () => __awaiter(void 0, void 0, void 0, function* () { yield new content_type_schema_handler_1.ContentTypeSchemaHandler().import(context); }));
    yield (0, typed_result_1.timed)('content-type import', () => __awaiter(void 0, void 0, void 0, function* () { yield new content_type_handler_1.ContentTypeHandler().import(context); }));
    context.config = yield (0, amplience_helper_1.getEnvConfig)(context);
    yield (0, import_helper_1.copyTemplateFilesToTempDir)(context);
    let workflowStates = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.workflowStates.list);
    context.mapping = Object.assign(Object.assign({}, context.mapping), { cms: {
            hub: context.config.cms.hub,
            hubs: context.config.cms.hubs,
            repositories: lodash_1.default.zipObject(lodash_1.default.map(Object.keys(context.hub.repositories)), lodash_1.default.map(Object.values(context.hub.repositories), 'id')),
            workflowStates: lodash_1.default.zipObject(lodash_1.default.map(workflowStates, ws => lodash_1.default.camelCase(ws.label)), lodash_1.default.map(workflowStates, 'id'))
        }, algolia: context.config.algolia, dam: yield (0, amplience_helper_1.readDAMMapping)(context) });
    (0, logger_1.logHeadline)(`Phase 2: import/update`);
    yield (0, import_helper_1.copyTemplateFilesToTempDir)(context);
    yield new settings_handler_1.SettingsHandler().import(context);
    yield new extension_handler_1.ExtensionHandler().import(context);
    let algolia = yield new search_index_handler_1.SearchIndexHandler().import(context);
    if (algolia) {
        context.config.algolia.appId = algolia.appId;
        context.config.algolia.apiKey = algolia.apiKey;
        context.mapping.algolia = algolia;
    }
    yield amplience_helper_1.default.updateEnvConfig(context);
    if (!context.skipContentImport) {
        yield (0, amplience_helper_1.initAutomation)(context);
        logger_1.default.debug(JSON.stringify(context.mapping, null, 4));
        yield new content_item_handler_1.ContentItemHandler().import(context);
        yield amplience_helper_1.default.cacheContentMap(context);
        context.mapping.contentMap = amplience_helper_1.default.getContentMap();
        (0, logger_1.logHeadline)(`Phase 3: update automation`);
        yield amplience_helper_1.default.updateAutomation(context);
        (0, logger_1.logHeadline)(`Phase 4: reentrant import`);
        logger_1.default.debug(JSON.stringify(context.mapping, null, 4));
        yield (0, import_helper_1.copyTemplateFilesToTempDir)(context);
        yield new content_type_schema_handler_1.ContentTypeSchemaHandler().import(context);
        yield new content_type_handler_1.ContentTypeHandler().import(context);
    }
}));
