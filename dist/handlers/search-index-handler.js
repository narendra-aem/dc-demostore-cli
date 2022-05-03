"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = __importStar(require("../common/logger"));
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = require("../common/prompts");
const fs_extra_1 = __importDefault(require("fs-extra"));
const async_1 = __importDefault(require("async"));
const retry = (count) => (fn, message) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let retryCount = 0;
    while (retryCount < count) {
        try {
            let runMessage = message;
            if (retryCount > 0) {
                runMessage = runMessage + ` ` + chalk_1.default.red(`[ retry ${retryCount} ]`);
            }
            logger_1.logUpdate(runMessage);
            return yield fn();
        }
        catch (error) {
            if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 504) {
                retryCount++;
            }
            else if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 409) {
                logger_1.default.debug(`got a 409/conflict while running the command: ${message}`);
                retryCount = count;
            }
            else {
                throw error;
            }
        }
    }
});
const retrier = retry(3);
class SearchIndexHandler extends resource_handler_1.ResourceHandler {
    constructor() {
        super(dc_management_sdk_js_1.SearchIndex, 'searchIndexes');
        this.icon = '🔍';
        this.sortPriority = 1.09;
    }
    import(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { hub, mapping } = context;
            let indexesFile = `${context.tempDir}/content/indexes/indexes.json`;
            let publishedIndexes = [];
            if (!fs_extra_1.default.existsSync(indexesFile)) {
                logger_1.default.info(`skipped, content/indexes/indexes.json not found`);
                return;
            }
            else {
                let testIndexes = fs_extra_1.default.readJsonSync(`${context.tempDir}/content/indexes/test-index.json`);
                let importIndexes = fs_extra_1.default.readJsonSync(indexesFile);
                const indexes = testIndexes.concat(importIndexes);
                let publishedIndexes = yield dc_demostore_integration_1.paginator(dc_demostore_integration_1.searchIndexPaginator(hub));
                let unpublishedIndexes = lodash_1.default.filter(indexes, idx => !lodash_1.default.includes(lodash_1.default.map(publishedIndexes, 'name'), idx.indexDetails.name));
                let searchIndexCount = 0;
                let replicaCount = 0;
                let webhookCount = 0;
                yield async_1.default.eachSeries(unpublishedIndexes, (item, callback) => __awaiter(this, void 0, void 0, function* () {
                    delete item.indexDetails.id;
                    delete item.indexDetails.replicaCount;
                    let createdIndex = yield retrier(() => hub.related.searchIndexes.create(item.indexDetails), `create index: ${chalk_1.default.cyanBright(item.indexDetails.name)}`);
                    searchIndexCount++;
                    yield retrier(() => createdIndex.related.settings.update(item.settings), `apply settings: ${chalk_1.default.cyanBright(item.indexDetails.name)}`);
                    publishedIndexes = yield dc_demostore_integration_1.paginator(dc_demostore_integration_1.searchIndexPaginator(hub));
                    const replicasSettings = item.replicasSettings;
                    const replicasIndexes = lodash_1.default.map(replicasSettings, (item) => lodash_1.default.find(publishedIndexes, i => i.name === item.name));
                    yield Promise.all(replicasIndexes.map((replicaIndex, index) => __awaiter(this, void 0, void 0, function* () {
                        yield retrier(() => replicaIndex.related.settings.update(replicasSettings[index].settings), `apply replica settings: ${chalk_1.default.cyanBright(replicaIndex.name)}`);
                        replicaCount++;
                    })));
                    const types = yield dc_demostore_integration_1.paginator(createdIndex.related.assignedContentTypes.list);
                    if (types.length > 0) {
                        const type = types[0];
                        const activeContentWebhookId = type._links['active-content-webhook'].href.split('/').slice(-1)[0];
                        const archivedContentWebhookId = type._links['archived-content-webhook'].href.split('/').slice(-1)[0];
                        const webhooks = yield dc_demostore_integration_1.paginator(hub.related.webhooks.list);
                        const activeContentWebhook = lodash_1.default.find(webhooks, hook => hook.id === activeContentWebhookId);
                        const archivedContentWebhook = lodash_1.default.find(webhooks, hook => hook.id === archivedContentWebhookId);
                        if (activeContentWebhook && archivedContentWebhook) {
                            activeContentWebhook.customPayload = {
                                type: 'text/x-handlebars-template',
                                value: item.activeContentWebhook
                            };
                            yield retrier(() => activeContentWebhook.related.update(activeContentWebhook), `update webhook: ${chalk_1.default.cyanBright(activeContentWebhook.label)}`);
                            webhookCount++;
                            activeContentWebhook.customPayload = {
                                type: 'text/x-handlebars-template',
                                value: item.archivedContentWebhook
                            };
                            yield retrier(() => archivedContentWebhook.related.update(archivedContentWebhook), `update webhook: ${chalk_1.default.cyanBright(archivedContentWebhook.label)}`);
                            webhookCount++;
                        }
                    }
                    callback();
                }));
                logger_1.logComplete(`${this.getDescription()}: [ ${chalk_1.default.green(searchIndexCount)} created ] [ ${chalk_1.default.green(replicaCount)} replicas created ] [ ${chalk_1.default.green(webhookCount)} webhooks created ]`);
            }
            publishedIndexes = yield dc_demostore_integration_1.paginator(dc_demostore_integration_1.searchIndexPaginator(hub));
            const index = lodash_1.default.first(publishedIndexes);
            if (index) {
                let key = yield index.related.keys.get();
                context.config.algolia = Object.assign(Object.assign({}, context.config.algolia), { appId: key.applicationId, key: key.key });
            }
            yield context.amplienceHelper.updateDemoStoreConfig();
        });
    }
    cleanup(context) {
        return __awaiter(this, void 0, void 0, function* () {
            let searchIndexes = yield dc_demostore_integration_1.paginator(dc_demostore_integration_1.searchIndexPaginator(context.hub));
            let searchIndexCount = 0;
            let replicaCount = 0;
            yield async_1.default.each(searchIndexes, ((searchIndex, callback) => __awaiter(this, void 0, void 0, function* () {
                if (searchIndex.replicaCount && searchIndex.replicaCount > 0) {
                    let replicas = yield dc_demostore_integration_1.paginator(dc_demostore_integration_1.replicaPaginator(searchIndex));
                    yield Promise.all(replicas.map((replica) => __awaiter(this, void 0, void 0, function* () {
                        yield retrier(() => replica.related.delete(), `${prompts_1.prompts.delete} replica index ${chalk_1.default.cyan(replica.name)}...`);
                        replicaCount++;
                    })));
                }
                yield retrier(() => searchIndex.related.delete(), `${prompts_1.prompts.delete} search index ${chalk_1.default.cyan(searchIndex.name)}...`);
                searchIndexCount++;
                callback();
            })));
            logger_1.logComplete(`${this.getDescription()}: [ ${chalk_1.default.red(searchIndexCount)} deleted ] [ ${chalk_1.default.red(replicaCount)} replicas deleted ]`);
        });
    }
}
exports.SearchIndexHandler = SearchIndexHandler;
