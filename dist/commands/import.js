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
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importStar(require("../common/logger"));
const content_type_schema_handler_1 = require("../handlers/content-type-schema-handler");
const content_item_handler_1 = require("../handlers/content-item-handler");
const extension_handler_1 = require("../handlers/extension-handler");
const webhook_handler_1 = require("../handlers/webhook-handler");
const settings_handler_1 = require("../handlers/settings-handler");
const middleware_1 = require("../common/middleware");
const amplience_builder_1 = __importDefault(require("../common/amplience-builder"));
const search_index_handler_1 = require("../handlers/search-index-handler");
const automation_helper_1 = require("../helpers/automation-helper");
exports.command = 'import';
exports.desc = "Import hub data";
const builder = (yargs) => {
    return (0, amplience_builder_1.default)(yargs).options({
        automationDir: {
            alias: 'a',
            describe: 'path to automation directory',
            default: automation_helper_1.AUTOMATION_DIR_PATH
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
        openaiKey: {
            alias: 'o',
            describe: 'OpenAI Key (required for rich text AI features)',
            type: 'string',
            default: ''
        }
    }).middleware([
        (context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context.config) {
                context.config = yield context.amplienceHelper.getDemoStoreConfig();
            }
            yield (0, automation_helper_1.setupAutomationTemplateFiles)(context);
        })
    ])
        .command("extensions", "Import extensions", {}, importHandler(new extension_handler_1.ExtensionHandler()))
        .command("webhooks", "Import webhooks", {}, importHandler(new webhook_handler_1.WebhookHandler()))
        .command("settings", "Import settings", {}, importHandler(new settings_handler_1.SettingsHandler()))
        .command("types", "Import content types/schemas", {}, importHandler(new content_type_schema_handler_1.ContentTypeSchemaHandler()))
        .command("search-indexes", "Import search indexes", {}, importHandler(new search_index_handler_1.SearchIndexHandler()));
};
exports.builder = builder;
const importHandler = (handler) => (context) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, automation_helper_1.processAutomationTemplateFiles)(context);
    yield handler.import(context);
});
exports.handler = (0, middleware_1.contextHandler)((context) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.default.info(`${chalk_1.default.green(exports.command)}: ${exports.desc} started at ${chalk_1.default.magentaBright(context.startTime)}`);
    (0, logger_1.logHeadline)(`Phase 1: preparation`);
    yield (0, automation_helper_1.processAutomationTemplateFiles)(context);
    yield new content_type_schema_handler_1.ContentTypeSchemaHandler().import(context);
    (0, logger_1.logHeadline)(`Phase 2: import/update`);
    yield importHandler(new settings_handler_1.SettingsHandler())(context);
    yield importHandler(new extension_handler_1.ExtensionHandler())(context);
    yield importHandler(new webhook_handler_1.WebhookHandler())(context);
    yield importHandler(new search_index_handler_1.SearchIndexHandler())(context);
    if (!context.skipContentImport) {
        (0, logger_1.logHeadline)(`Phase 3: content import`);
        yield importHandler(new content_item_handler_1.ContentItemHandler())(context);
        (0, logger_1.logHeadline)(`Phase 4: reentrant import`);
        yield importHandler(new content_type_schema_handler_1.ContentTypeSchemaHandler())(context);
    }
    (0, logger_1.logHeadline)(`Phase 5: generate demostore configuration`);
    yield context.amplienceHelper.generateDemoStoreConfig();
}));
