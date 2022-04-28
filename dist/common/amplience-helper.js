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
exports.readDAMMapping = exports.updateAutomation = exports.updateAutomationContentItems = exports.readAutomation = exports.initAutomation = exports.updateEnvConfig = exports.getEnvConfig = exports.getContentMap = exports.getContentItemById = exports.getContentItemByKey = exports.cacheContentMap = exports.contentMap = exports.publishAll = exports.PublishingQueue = exports.getContentItemFromCDN = exports.publishContentItem = exports.get = exports.deleteFolder = exports.synchronizeContentType = void 0;
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const logger_1 = __importStar(require("./logger"));
const chalk_1 = __importDefault(require("chalk"));
const logger_2 = require("./logger");
const lodash_1 = __importDefault(require("lodash"));
const content_item_handler_1 = require("../handlers/content-item-handler");
const dc_management_sdk_js_2 = require("dc-management-sdk-js");
const fs_extra_1 = __importDefault(require("fs-extra"));
const utils_1 = require("./utils");
const environment_manager_1 = require("./environment-manager");
let dcUrl = `https://api.amplience.net/v2/content`;
let accessToken = undefined;
let axiosClient = new dc_management_sdk_js_2.AxiosHttpClient({});
const login = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let oauthResponse = yield axiosClient.request({
        method: dc_management_sdk_js_1.HttpMethod.POST,
        url: `https://auth.amplience.net/oauth/token?client_id=${context.environment.dc.clientId}&client_secret=${context.environment.dc.clientSecret}&grant_type=client_credentials`,
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        }
    });
    accessToken = oauthResponse.data.access_token;
    axiosClient = new dc_management_sdk_js_2.AxiosHttpClient({
        baseURL: dcUrl,
        headers: { authorization: `bearer ${accessToken}`, 'content-type': 'application/json' }
    });
    logger_1.default.debug(`${chalk_1.default.green('logged in')} to dynamic content at ${chalk_1.default.yellow(new Date().valueOf())}`);
    setTimeout(() => { accessToken = undefined; }, oauthResponse.data.expires_in * 1000);
});
let ax = {
    get: (url) => __awaiter(void 0, void 0, void 0, function* () { return yield axiosClient.request({ method: dc_management_sdk_js_1.HttpMethod.GET, url }); }),
    post: (url) => __awaiter(void 0, void 0, void 0, function* () { return yield axiosClient.request({ method: dc_management_sdk_js_1.HttpMethod.POST, url }); }),
    patch: (url) => __awaiter(void 0, void 0, void 0, function* () { return yield axiosClient.request({ method: dc_management_sdk_js_1.HttpMethod.PATCH, url }); }),
    delete: (url) => __awaiter(void 0, void 0, void 0, function* () { return yield axiosClient.request({ method: dc_management_sdk_js_1.HttpMethod.DELETE, url }); })
};
const synchronizeContentType = (contentType) => __awaiter(void 0, void 0, void 0, function* () { return yield ax.patch(`/content-types/${contentType.id}/schema`); });
exports.synchronizeContentType = synchronizeContentType;
const deleteFolder = (folder) => __awaiter(void 0, void 0, void 0, function* () { return yield ax.delete(`/folders/${folder.id}`); });
exports.deleteFolder = deleteFolder;
exports.get = ax.get;
const publishContentItem = (item) => __awaiter(void 0, void 0, void 0, function* () {
    yield ax.post(`/content-items/${item.id}/publish`);
    updateCache(item);
    return item;
});
exports.publishContentItem = publishContentItem;
const getContentItemFromCDN = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const environment = yield (0, environment_manager_1.currentEnvironment)();
    return yield (yield ax.get(`https://${environment.name}.cdn.content.amplience.net/content/id/${id}`)).data;
});
exports.getContentItemFromCDN = getContentItemFromCDN;
const PublishingQueue = (postProcess = (x) => __awaiter(void 0, void 0, void 0, function* () { })) => {
    let queue = [];
    return {
        add: (item) => queue.push(item),
        length: () => queue.length,
        publish: () => __awaiter(void 0, void 0, void 0, function* () {
            let count = 0;
            let chunks = lodash_1.default.reverse(lodash_1.default.chunk(queue, 100));
            while (chunks.length > 0) {
                let chunk = chunks.pop();
                if (chunk) {
                    const start = new Date().valueOf();
                    (0, logger_2.logUpdate)(`publishing ${chalk_1.default.blueBright(chunk.length)} items...`);
                    yield Promise.all(chunk.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                        yield (0, exports.publishContentItem)(item);
                        yield postProcess(item);
                        count++;
                    })));
                    if (chunks.length > 0) {
                        const current = new Date().valueOf();
                        const remainder = Math.ceil((60000 - (current - start)) / 1000);
                        for (let index = remainder; index > 0; index--) {
                            (0, logger_2.logUpdate)(`sleeping ${chalk_1.default.blueBright(index)} seconds before next chunk...`, false);
                            yield (0, utils_1.sleep)(1000);
                        }
                    }
                }
            }
            return count;
        })
    };
};
exports.PublishingQueue = PublishingQueue;
const publishAll = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const publishingQueue = (0, exports.PublishingQueue)();
    yield context.hub.contentItemIterator(contentItem => {
        if (contentItem.version !== contentItem.lastPublishedVersion) {
            publishingQueue.add(contentItem);
        }
    });
    const publishedCount = yield publishingQueue.publish();
    (0, logger_1.logComplete)(`${new content_item_handler_1.ContentItemHandler().getDescription()}: [ ${chalk_1.default.green(publishedCount)} published ]`);
});
exports.publishAll = publishAll;
exports.contentMap = {};
const cacheContentMap = (context) => __awaiter(void 0, void 0, void 0, function* () { return yield context.hub.contentItemIterator(updateCache); });
exports.cacheContentMap = cacheContentMap;
const updateCache = (item) => {
    exports.contentMap[item.body._meta.deliveryKey] = item;
    exports.contentMap[item.id] = item;
};
const getContentItemByKey = (key) => exports.contentMap[key];
exports.getContentItemByKey = getContentItemByKey;
const getContentItemById = (id) => exports.contentMap[id];
exports.getContentItemById = getContentItemById;
const getContentMap = () => lodash_1.default.zipObject(lodash_1.default.map(exports.contentMap, (__, key) => key.replace(/\//g, '-')), lodash_1.default.map(exports.contentMap, 'deliveryId'));
exports.getContentMap = getContentMap;
const getEnvConfig = (context) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let { hub, environment } = context;
    let deliveryKey = `aria/env/default`;
    let demoStoreConfigSchema = `https://demostore.amplience.com/site/demostoreconfig`;
    let restSchema = `https://demostore.amplience.com/site/integration/rest`;
    logger_1.default.info(`environment lookup [ hub ${chalk_1.default.magentaBright(hub.name)} ] [ key ${chalk_1.default.blueBright(deliveryKey)} ]`);
    let config = yield (0, exports.getContentItemByKey)(deliveryKey);
    if (!config || !config.body) {
        logger_1.default.info(`${deliveryKey} not found, creating...`);
        let restCodec = new dc_management_sdk_js_1.ContentItem();
        restCodec.label = `generic rest commerce configuration`;
        restCodec.body = {
            _meta: {
                name: `generic rest commerce configuration`,
                schema: restSchema,
                deliveryKey: `aria/config/rest`
            },
            productURL: `https://demostore-catalog.s3.us-east-2.amazonaws.com/products.json`,
            categoryURL: `https://demostore-catalog.s3.us-east-2.amazonaws.com/categories.json`,
            customerGroupURL: `https://demostore-catalog.s3.us-east-2.amazonaws.com/customerGroups.json`,
            translationsURL: `https://demostore-catalog.s3.us-east-2.amazonaws.com/translations.json`,
        };
        restCodec = yield context.hub.repositories.sitestructure.related.contentItems.create(restCodec);
        yield (0, exports.publishContentItem)(restCodec);
        config = new dc_management_sdk_js_1.ContentItem();
        config.label = `${environment.name} Demo Store config`;
        config.body = {
            _meta: {
                name: `${environment.name} Demo Store config`,
                schema: demoStoreConfigSchema,
                deliveryKey
            },
            environment: environment.name,
            url: environment.url,
            algolia: {
                indexes: [{
                        key: 'blog',
                        prod: `${environment.name}.blog-production`,
                        staging: `${environment.name}.blog-staging`
                    }],
                appId: '',
                apiKey: ''
            },
            commerce: {
                _meta: {
                    schema: "http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference"
                },
                id: restCodec.id,
                contentType: "https://demostore.amplience.com/site/integration/rest"
            },
            cms: {
                hub: {
                    name: environment.name,
                    stagingApi: (yield ((_b = (_a = hub.settings) === null || _a === void 0 ? void 0 : _a.virtualStagingEnvironment) === null || _b === void 0 ? void 0 : _b.hostname)) || ''
                },
                hubs: [{
                        key: 'productImages',
                        name: 'willow'
                    }]
            }
        };
        config = yield context.hub.repositories.sitestructure.related.contentItems.create(config);
        yield (0, exports.publishContentItem)(config);
    }
    return config.body;
});
exports.getEnvConfig = getEnvConfig;
const updateEnvConfig = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let { config } = context;
    let envConfig = yield (0, exports.getContentItemByKey)(`aria/env/default`);
    if (!envConfig) {
        throw new Error('aria/env/default not found when trying to update environment config');
    }
    envConfig.body = config;
    envConfig = yield envConfig.related.update(envConfig);
    yield (0, exports.publishContentItem)(envConfig);
});
exports.updateEnvConfig = updateEnvConfig;
const initAutomation = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let automation = yield (0, exports.readAutomation)(context);
    fs_extra_1.default.writeJsonSync(`${context.tempDir}/mapping.json`, {
        contentItems: lodash_1.default.map(automation.body.contentItems, ci => [ci.from, ci.to]),
        workflowStates: lodash_1.default.map(automation.body.workflowStates, ws => [ws.from, ws.to])
    });
    context.automation = {
        contentItems: automation.body.contentItems,
        workflowStates: automation.body.workflowStates
    };
    fs_extra_1.default.copyFileSync(`${context.tempDir}/mapping.json`, `${context.tempDir}/old_mapping.json`);
    logger_1.default.info(`wrote mapping file at ${context.tempDir}/mapping.json`);
});
exports.initAutomation = initAutomation;
const readAutomation = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let { environment } = context;
    let deliveryKey = `aria/automation/default`;
    let schema = `https://demostore.amplience.com/site/automation`;
    let automation = yield (0, exports.getContentItemByKey)(deliveryKey);
    if (!automation) {
        logger_1.default.info(`${deliveryKey} not found, creating...`);
        automation = new dc_management_sdk_js_1.ContentItem();
        automation.label = `${environment.name} Demo Store automation`;
        automation.body = {
            _meta: {
                name: `${environment.name} Demo Store automation`,
                schema,
                deliveryKey
            },
            contentItems: [],
            workflowStates: []
        };
        automation = yield context.hub.repositories.sitestructure.related.contentItems.create(automation);
        yield (0, exports.publishContentItem)(automation);
    }
    return automation;
});
exports.readAutomation = readAutomation;
const updateAutomationContentItems = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let automation = yield (0, exports.readAutomation)(context);
    automation.body = Object.assign(Object.assign({}, automation.body), { contentItems: context.automation.contentItems });
    automation = yield automation.related.update(automation);
    yield (0, exports.publishContentItem)(automation);
});
exports.updateAutomationContentItems = updateAutomationContentItems;
const updateAutomation = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let mappingStats = fs_extra_1.default.statSync(`${context.tempDir}/old_mapping.json`);
    let newMappingStats = fs_extra_1.default.statSync(`${context.tempDir}/mapping.json`);
    if (newMappingStats.size !== mappingStats.size) {
        logger_1.default.info(`updating mapping...`);
        let newMapping = fs_extra_1.default.readJsonSync(`${context.tempDir}/mapping.json`);
        logger_1.default.info(`saving mapping...`);
        let automation = yield (0, exports.readAutomation)(context);
        automation.body = Object.assign(Object.assign({}, automation.body), { contentItems: lodash_1.default.map(newMapping.contentItems, x => ({ from: x[0], to: x[1] })), workflowStates: lodash_1.default.map(newMapping.workflowStates, x => ({ from: x[0], to: x[1] })) });
        automation = yield automation.related.update(automation);
        yield (0, exports.publishContentItem)(automation);
    }
});
exports.updateAutomation = updateAutomation;
const readDAMMapping = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let assets = lodash_1.default.filter(yield context.damService.getAssetsListForBucket('Assets'), asset => asset.status === 'active');
    let endpoints = yield context.damService.getEndpoints();
    let endpoint = lodash_1.default.first(endpoints);
    return {
        mediaEndpoint: endpoint.tag,
        imagesMap: lodash_1.default.zipObject(lodash_1.default.map(assets, x => lodash_1.default.camelCase(x.name)), lodash_1.default.map(assets, 'id'))
    };
});
exports.readDAMMapping = readDAMMapping;
exports.default = {
    login,
    publishContentItem: exports.publishContentItem,
    synchronizeContentType: exports.synchronizeContentType,
    publishAll: exports.publishAll,
    getContentItemByKey: exports.getContentItemByKey,
    getContentItemById: exports.getContentItemById,
    getEnvConfig: exports.getEnvConfig,
    cacheContentMap: exports.cacheContentMap,
    updateEnvConfig: exports.updateEnvConfig,
    getContentMap: exports.getContentMap,
    initAutomation: exports.initAutomation,
    updateAutomation: exports.updateAutomation,
    contentMap: exports.contentMap
};
