"use strict";
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
const middleware_1 = require("../common/middleware");
const amplience_builder_1 = __importDefault(require("../common/amplience-builder"));
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const dc_demostore_integration_2 = require("@amplience/dc-demostore-integration");
const utils_1 = require("../common/utils");
const logger_1 = __importDefault(require("../common/logger"));
const chalk_1 = __importDefault(require("chalk"));
exports.command = 'update';
exports.desc = "Update hub retail pointers";
exports.builder = amplience_builder_1.default;
exports.handler = (0, middleware_1.contextHandler)((context) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let demoStoreConfig = (yield context.amplienceHelper.getDemoStoreConfig()).body;
    let commerce = (yield context.amplienceHelper.getContentItem(demoStoreConfig.commerce.id)).body;
    if (!commerce) {
        throw new Error(`commerce integration not found!`);
    }
    let commerceAPI = yield (0, dc_demostore_integration_1.getCommerceAPI)(commerce);
    let megaMenu = yield commerceAPI.getMegaMenu({});
    let { hub } = context;
    let contentTypeSchemas = yield (0, dc_demostore_integration_2.paginator)(hub.related.contentTypeSchema.list);
    let contentTypes = yield (0, dc_demostore_integration_2.paginator)(hub.related.contentTypes.list);
    let productGridSchema = contentTypeSchemas.find(s => s.schemaId === 'https://demostore.amplience.com/content/product-grid');
    if (productGridSchema) {
        let jsonBody = JSON.parse(productGridSchema.body || '');
        if ((_b = (_a = jsonBody === null || jsonBody === void 0 ? void 0 : jsonBody.properties) === null || _a === void 0 ? void 0 : _a.category) === null || _b === void 0 ? void 0 : _b.enum) {
            jsonBody.properties.category.enum = lodash_1.default.map(megaMenu, 'slug');
        }
        productGridSchema.body = JSON.stringify(jsonBody, undefined, 4);
        yield productGridSchema.related.update(productGridSchema);
        let contentType = contentTypes.find(type => type.contentTypeUri === 'https://demostore.amplience.com/content/product-grid');
        if (contentType) {
            yield contentType.related.contentTypeSchema.update();
        }
        else {
            logger_1.default.error(`failed to synchronize content type [ https://demostore.amplience.com/content/product-grid ], content type not found`);
        }
    }
    let populated = lodash_1.default.sortBy(yield Promise.all(megaMenu.map((category) => __awaiter(void 0, void 0, void 0, function* () {
        return yield commerceAPI.getCategory({ slug: category.slug });
    }))), cat => cat.products.length);
    let mostPopulated = lodash_1.default.last(populated);
    let contentItems = yield context.amplienceHelper.getContentItemsInRepository('content');
    yield Promise.all(contentItems.map((contentItem) => __awaiter(void 0, void 0, void 0, function* () {
        if (contentItem.body._meta.schema === 'https://demostore.amplience.com/content/curated-product-grid') {
            logger_1.default.info(`Updating curated-product-grid...`);
            contentItem.body.products = yield Promise.all(contentItem.body.products.map((productId) => __awaiter(void 0, void 0, void 0, function* () {
                let product = yield commerceAPI.getProduct({ id: productId });
                if (!product && mostPopulated) {
                    let randomProduct = (0, utils_1.getRandom)(mostPopulated.products);
                    logger_1.default.info(`mapped product [ ${chalk_1.default.gray(productId)} ] to [ ${chalk_1.default.green(randomProduct.name)} ]`);
                    productId = randomProduct.id;
                }
                return productId;
            })));
            contentItem = yield contentItem.related.update(contentItem);
            yield context.amplienceHelper.publishContentItem(contentItem);
        }
        if (contentItem.body._meta.schema === 'https://demostore.amplience.com/content/product-grid') {
            let category = yield commerceAPI.getCategory({ slug: contentItem.body.category });
            if (!category && mostPopulated) {
                logger_1.default.info(`Updating product-grid...`);
                contentItem.body.category = mostPopulated.slug;
                contentItem = yield contentItem.related.update(contentItem);
                yield context.amplienceHelper.publishContentItem(contentItem);
            }
        }
    })));
}));
