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
exports.SearchIndexHandler = void 0;
const resource_handler_1 = require("./resource-handler");
const logger_1 = __importStar(require("../common/logger"));
const algoliasearch_1 = __importDefault(require("algoliasearch"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = require("../common/prompts");
class SearchIndexHandler extends resource_handler_1.ResourceHandler {
    constructor() {
        super(undefined, 'searchIndexes');
        this.icon = '🔎';
    }
    import(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            (0, logger_1.logSubheading)(`[ import ] search indexes`);
            const { algolia } = context.environment;
            if (!(algolia === null || algolia === void 0 ? void 0 : algolia.appId) || !algolia.writeKey) {
                logger_1.default.info(`skipped, algolia environment not configured`);
                return;
            }
            const client = (0, algoliasearch_1.default)(algolia.appId, algolia.writeKey);
            const indexesFile = `${context.tempDir}/content/indexes/indexes.json`;
            if (!(0, fs_1.existsSync)(indexesFile)) {
                logger_1.default.info(`skipped, content/indexes/indexes.json not found`);
                return;
            }
            const indexFixtures = (0, fs_extra_1.readJsonSync)(indexesFile);
            for (const { indexDetails, settings } of indexFixtures) {
                try {
                    (0, logger_1.logUpdate)(`apply index settings: ${chalk_1.default.cyanBright(indexDetails.name)}`);
                    const index = client.initIndex(indexDetails.name);
                    index.setSettings(settings);
                }
                catch (error) {
                    logger_1.default.error(`${prompts_1.prompts.error} applying index settings [ ${indexDetails.name} ]: ${error.message}`);
                }
            }
            (0, logger_1.logComplete)(`${this.getDescription()}: [ ${chalk_1.default.green(indexFixtures.length)} updated ]`);
            context.config.algolia = {
                appId: ((_a = context.environment.algolia) === null || _a === void 0 ? void 0 : _a.appId) || '',
                apiKey: ((_b = context.environment.algolia) === null || _b === void 0 ? void 0 : _b.searchKey) || ''
            };
        });
    }
    cleanup(context) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, logger_1.logSubheading)(`[ cleanup ] search indexes`);
            const { algolia } = context.environment;
            if (!(algolia === null || algolia === void 0 ? void 0 : algolia.appId) || !algolia.writeKey) {
                logger_1.default.info(`skipped, algolia environment not configured`);
                return;
            }
            const client = (0, algoliasearch_1.default)(algolia.appId, algolia.writeKey);
            const indexesFile = `${context.tempDir}/content/indexes/indexes.json`;
            if (!(0, fs_1.existsSync)(indexesFile)) {
                logger_1.default.info(`skipped, content/indexes/indexes.json not found`);
                return;
            }
            const indexFixtures = (0, fs_extra_1.readJsonSync)(indexesFile);
            for (const { indexDetails } of indexFixtures) {
                try {
                    (0, logger_1.logUpdate)(`deleting index objects: ${chalk_1.default.cyanBright(indexDetails.name)}`);
                    const index = client.initIndex(indexDetails.name);
                    yield index.clearObjects();
                }
                catch (error) {
                    logger_1.default.error(`${prompts_1.prompts.error} deleting index objects [ ${indexDetails.name} ]: ${error.message}`);
                }
            }
            (0, logger_1.logComplete)(`${this.getDescription()}: [ ${chalk_1.default.red(indexFixtures.length)} cleared ]`);
        });
    }
}
exports.SearchIndexHandler = SearchIndexHandler;
