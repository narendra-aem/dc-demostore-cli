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
exports.schemas = exports.labels = exports.deliveryKeys = void 0;
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const logger_1 = __importStar(require("./logger"));
const chalk_1 = __importDefault(require("chalk"));
const logger_2 = require("./logger");
const lodash_1 = __importDefault(require("lodash"));
const content_item_handler_1 = require("../handlers/content-item-handler");
const fs_extra_1 = __importDefault(require("fs-extra"));
const utils_1 = require("./utils");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const dam_service_1 = require("../dam/dam-service");
exports.deliveryKeys = {
    config: `demostore/config/default`,
    automation: `demostore/automation`,
    rest: `demostore/integration/rest`
};
exports.labels = {
    config: `demostore config`,
    automation: `demostore automation`,
    rest: `generic rest commerce configuration`
};
exports.schemas = {
    config: `https://demostore.amplience.com/site/demostoreconfig`,
    automation: `https://demostore.amplience.com/site/automation`,
    rest: `https://demostore.amplience.com/site/integration/rest`
};
const baseURL = `https://demostore-catalog.s3.us-east-2.amazonaws.com`;
const restMap = {};
const damServiceMap = {};
let contentMap = {};
const AmplienceHelperGenerator = (context) => {
    const rest = restMap[context.environment.dc.clientId] = restMap[context.environment.dc.clientId] || (0, dc_demostore_integration_1.OAuthRestClient)({
        api_url: `https://api.amplience.net/v2/content`,
        auth_url: `https://auth.amplience.net/oauth/token?client_id=${context.environment.dc.clientId}&client_secret=${context.environment.dc.clientSecret}&grant_type=client_credentials`
    }, {}, {
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        }
    });
    const getContentItems = (hub, opts) => __awaiter(void 0, void 0, void 0, function* () {
        return lodash_1.default.flatMap(yield Promise.all((yield (0, dc_demostore_integration_1.paginator)(hub.related.contentRepositories.list)).map((repo) => __awaiter(void 0, void 0, void 0, function* () {
            return yield (0, dc_demostore_integration_1.paginator)(repo.related.contentItems.list, opts);
        }))));
    });
    const timedBlock = (tag, fn) => __awaiter(void 0, void 0, void 0, function* () {
        const start = new Date().valueOf();
        const result = yield fn();
        const duration = new Date().valueOf() - start;
        logger_1.default.info(`${tag} completed in ${duration}ms`);
        return result;
    });
    const login = () => __awaiter(void 0, void 0, void 0, function* () {
        return yield timedBlock('login', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                let client = new dc_management_sdk_js_1.DynamicContent({
                    client_id: context.environment.dc.clientId,
                    client_secret: context.environment.dc.clientSecret
                });
                let hub = yield client.hubs.get(context.environment.dc.hubId);
                if (!hub) {
                    throw new Error(`hubId not found: ${context.environment.dc.hubId}`);
                }
                logger_1.default.info(`connected to hub ${chalk_1.default.bold.cyan(`[ ${hub.name} ]`)}`);
                return hub;
            }
            catch (error) {
                throw new Error(`error while logging in to dynamic content, check your credentials`);
            }
        }));
    });
    const deleteFolder = (folder) => __awaiter(void 0, void 0, void 0, function* () { return yield rest.delete(`/folders/${folder.id}`); });
    const get = rest.get;
    const updateContentMap = (item) => {
        contentMap[item.body._meta.deliveryKey] = item;
        contentMap[item.id] = item;
    };
    const cacheContentMap = () => __awaiter(void 0, void 0, void 0, function* () { return (yield getContentItems(context.hub, { status: dc_management_sdk_js_1.Status.ACTIVE })).forEach(updateContentMap); });
    const getContentMap = () => lodash_1.default.zipObject(lodash_1.default.map(contentMap, (__, key) => key.replace(/\//g, '-')), lodash_1.default.map(contentMap, 'deliveryId'));
    const getContentItem = (keyOrId) => contentMap[keyOrId];
    const getDAMMapping = () => __awaiter(void 0, void 0, void 0, function* () {
        const damService = damServiceMap[context.environment.dam.username] = damServiceMap[context.environment.dam.username] || (yield new dam_service_1.DAMService().init(context.environment.dam));
        let assets = lodash_1.default.filter(yield damService.getAssetsListForBucket('Assets'), asset => asset.status === 'active');
        let endpoint = lodash_1.default.first(yield damService.getEndpoints());
        return {
            mediaEndpoint: endpoint === null || endpoint === void 0 ? void 0 : endpoint.tag,
            imagesMap: lodash_1.default.zipObject(lodash_1.default.map(assets, x => lodash_1.default.camelCase(x.name)), lodash_1.default.map(assets, 'id'))
        };
    });
    const getAutomation = () => __awaiter(void 0, void 0, void 0, function* () {
        return yield ensureContentItem('automation', {
            contentItems: [],
            workflowStates: []
        });
    });
    const getRestConfig = () => __awaiter(void 0, void 0, void 0, function* () {
        return yield ensureContentItem('rest', {
            productURL: `${baseURL}/products.json`,
            categoryURL: `${baseURL}/categories.json`,
            customerGroupURL: `${baseURL}/customerGroups.json`,
            translationsURL: `${baseURL}/translations.json`
        });
    });
    const getDemoStoreConfig = () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        return yield ensureContentItem('config', {
            url: context.environment.url,
            algolia: {
                appId: '',
                apiKey: ''
            },
            commerce: {
                _meta: {
                    schema: "http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference"
                },
                id: (yield getRestConfig()).id,
                contentType: exports.schemas.rest
            },
            cms: {
                hub: context.environment.name,
                stagingApi: ((_b = (_a = context.hub.settings) === null || _a === void 0 ? void 0 : _a.virtualStagingEnvironment) === null || _b === void 0 ? void 0 : _b.hostname) || '',
                imageHub: 'willow'
            }
        });
    });
    const updateDemoStoreConfig = () => __awaiter(void 0, void 0, void 0, function* () {
        yield updateContentItem('config', context.config);
    });
    const updateAutomation = () => __awaiter(void 0, void 0, void 0, function* () {
        let mappingStats = fs_extra_1.default.statSync(`${context.tempDir}/old_mapping.json`);
        let newMappingStats = fs_extra_1.default.statSync(`${context.tempDir}/mapping.json`);
        if (newMappingStats.size !== mappingStats.size) {
            logger_1.default.info(`updating mapping...`);
            let newMapping = fs_extra_1.default.readJsonSync(`${context.tempDir}/mapping.json`);
            logger_1.default.info(`saving mapping...`);
            let automation = yield getAutomation();
            yield updateContentItem('automation', Object.assign(Object.assign({}, automation.body), { contentItems: lodash_1.default.map(newMapping.contentItems, x => ({ from: x[0], to: x[1] })), workflowStates: lodash_1.default.map(newMapping.workflowStates, x => ({ from: x[0], to: x[1] })) }));
        }
    });
    const ensureContentItem = (key, body) => __awaiter(void 0, void 0, void 0, function* () {
        let item = yield getContentItem(exports.deliveryKeys[key]);
        if (!item) {
            logger_1.default.info(`${exports.deliveryKeys[key]} not found, creating...`);
            item = new dc_management_sdk_js_1.ContentItem();
            item.label = exports.labels[key];
            item.body = Object.assign({ _meta: {
                    name: exports.labels[key],
                    schema: exports.schemas[key],
                    deliveryKey: exports.deliveryKeys[key]
                } }, body);
            item = yield (yield getContentRepository('sitestructure')).related.contentItems.create(item);
            yield publishContentItem(item);
        }
        return item;
    });
    const getContentRepository = (key) => __awaiter(void 0, void 0, void 0, function* () {
        let repositories = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.contentRepositories.list);
        let repo = repositories.find(repo => repo.name === key);
        if (!repo) {
            throw new Error(`repository [ ${key} ] not found`);
        }
        return repo;
    });
    const getContentItemsInRepository = (key) => __awaiter(void 0, void 0, void 0, function* () {
        return yield (0, dc_demostore_integration_1.paginator)((yield getContentRepository(key)).related.contentItems.list, { status: 'ACTIVE' });
    });
    const updateContentItem = (key, body) => __awaiter(void 0, void 0, void 0, function* () {
        let item = yield ensureContentItem(key, body);
        item.body = body;
        item = yield item.related.update(item);
        yield publishContentItem(item);
    });
    const publishContentItem = (item) => __awaiter(void 0, void 0, void 0, function* () {
        yield rest.post(`/content-items/${item.id}/publish`);
        updateContentMap(item);
    });
    const publishAll = () => __awaiter(void 0, void 0, void 0, function* () {
        let unpublished = (yield getContentItems(context.hub, { status: dc_management_sdk_js_1.Status.ACTIVE })).filter(ci => ci.version !== ci.lastPublishedVersion);
        let chunks = lodash_1.default.reverse(lodash_1.default.chunk(unpublished, 100));
        while (chunks.length > 0) {
            let chunk = chunks.pop();
            if (chunk) {
                const start = new Date().valueOf();
                (0, logger_2.logUpdate)(`publishing ${chalk_1.default.blueBright(chunk.length)} items...`);
                yield Promise.all(chunk.map(publishContentItem));
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
        (0, logger_1.logComplete)(`${new content_item_handler_1.ContentItemHandler().getDescription()}: [ ${chalk_1.default.green(unpublished.length)} published ]`);
    });
    return {
        getContentItem,
        getDemoStoreConfig,
        updateDemoStoreConfig,
        get,
        getAutomation,
        updateAutomation,
        cacheContentMap,
        getContentMap,
        getContentRepository,
        getContentItemsInRepository,
        getDAMMapping,
        publishContentItem,
        publishAll,
        deleteFolder,
        login
    };
};
exports.default = AmplienceHelperGenerator;
