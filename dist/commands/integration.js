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
exports.builder = exports.description = exports.command = void 0;
const lodash_1 = __importDefault(require("lodash"));
const amplience_builder_1 = __importDefault(require("../common/amplience-builder"));
const cli_table_1 = __importDefault(require("cli-table"));
const chalk_1 = __importDefault(require("chalk"));
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const logger_1 = __importStar(require("../common/logger"));
const utils_1 = require("../common/utils");
const amplience_helper_1 = require("../common/amplience-helper");
exports.command = 'integration';
exports.description = 'Manage integrations';
const getDefaultIntegration = (integrationKey, context) => __awaiter(void 0, void 0, void 0, function* () {
    let siteStructureContentItems = yield context.amplienceHelper.getContentItemsInRepository('sitestructure');
    let demostoreConfig = siteStructureContentItems.find(ci => ci.body._meta.deliveryKey === amplience_helper_1.deliveryKeys.config);
    return demostoreConfig === null || demostoreConfig === void 0 ? void 0 : demostoreConfig.body[integrationKey];
});
const getIntegrationItems = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let siteStructureContentItems = yield context.amplienceHelper.getContentItemsInRepository('sitestructure');
    return siteStructureContentItems.filter(ci => ci.body._meta.schema.indexOf('/site/integration') > -1);
});
const listIntegrations = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let table = new cli_table_1.default();
    let integrationItems = yield getIntegrationItems(context);
    let defaultCommerceIntegrationItem = yield getDefaultIntegration('commerce', context);
    integrationItems.forEach(item => {
        let label = defaultCommerceIntegrationItem.id === item.id ? `* ${item.label}` : `  ${item.label}`;
        table.push({ [chalk_1.default.yellow(label)]: item.body._meta.schema.split('/').pop() });
    });
    console.log(table.toString());
});
const Operation = operation => {
    const start = new Date().valueOf();
    return {
        do: (status) => __awaiter(void 0, void 0, void 0, function* () {
            let result = yield operation.execute();
            return Object.assign(Object.assign({}, operation), { result, duration: `${new Date().valueOf() - start}ms`, status: status(result) });
        })
    };
};
const checkCommerceIntegration = (item, context) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let config = yield context.amplienceHelper.getContentItem(item.deliveryId);
        let commerceAPI = yield (0, dc_demostore_integration_1.getCommerceCodec)(config.body);
        let allProducts = [];
        let megaMenu = [];
        let categories = [];
        let megaMenuOperation = yield Operation({
            tag: '☯️  get megamenu',
            execute: () => __awaiter(void 0, void 0, void 0, function* () { return yield commerceAPI.getMegaMenu({}); })
        }).do((mm) => {
            megaMenu = mm;
            let second = lodash_1.default.reduce(megaMenu, (sum, n) => { return lodash_1.default.concat(sum, n.children); }, []);
            let third = lodash_1.default.reduce(lodash_1.default.flatMap(megaMenu, 'children'), (sum, n) => { return lodash_1.default.concat(sum, n.children); }, []);
            categories = lodash_1.default.concat(megaMenu, second, third);
            return `[ ${chalk_1.default.green(megaMenu.length)} top level ] [ ${chalk_1.default.green(second.length)} second level ] [ ${chalk_1.default.green(third.length)} third level ]`;
        });
        let flattenedCategories = (0, dc_demostore_integration_1.flattenCategories)(categories);
        let categoryOperation = yield Operation({
            tag: '🧰  get category',
            execute: () => __awaiter(void 0, void 0, void 0, function* () { return yield commerceAPI.getCategory(flattenedCategories[0]); })
        }).do((cat) => {
            return ` has ${chalk_1.default.green(cat.products.length)} products`;
        });
        const categoryReadStart = new Date().valueOf();
        let categoryCount = 0;
        yield Promise.all(flattenedCategories.map((cat) => __awaiter(void 0, void 0, void 0, function* () {
            let category = yield commerceAPI.getCategory(cat);
            if (category) {
                cat.products = category.products;
                allProducts = lodash_1.default.concat(allProducts, cat.products);
                categoryCount++;
            }
            (0, logger_1.logUpdate)(`🧰  got [ ${categoryCount}/${flattenedCategories.length} ] categories and ${chalk_1.default.yellow(allProducts.length)} products`);
        })));
        allProducts = lodash_1.default.uniqBy(allProducts, 'id');
        (0, logger_1.logComplete)(`🧰  read ${chalk_1.default.green(flattenedCategories.length)} categories, ${chalk_1.default.yellow(allProducts.length)} products in ${chalk_1.default.cyan(`${new Date().valueOf() - categoryReadStart} ms`)}`);
        if (context.showMegaMenu) {
            console.log(`megaMenu ->`);
            lodash_1.default.each(megaMenu, tlc => {
                console.log(`${tlc.name} (${tlc.slug}) -- [ ${tlc.products.length} ]`);
                lodash_1.default.each(tlc.children, cat => {
                    console.log(`\t${cat.name} (${cat.slug}) -- [ ${cat.products.length} ]`);
                    lodash_1.default.each(cat.children, c => {
                        console.log(`\t\t${c.name} (${c.slug}) -- [ ${c.products.length} ]`);
                    });
                });
            });
        }
        let randomProduct = (0, utils_1.getRandom)(allProducts);
        let randomProduct2 = (0, utils_1.getRandom)(allProducts);
        let productOperation = yield Operation({
            tag: `💰  get product`,
            execute: () => __awaiter(void 0, void 0, void 0, function* () { return yield commerceAPI.getProduct(randomProduct); })
        }).do((product) => {
            return `found product [ ${chalk_1.default.yellow(product.name)} : ${chalk_1.default.green(product.variants[0].listPrice)} ]`;
        });
        let productIds = [randomProduct, randomProduct2].map(i => i.id);
        let productsOperation = yield Operation({
            tag: '💎  get products',
            execute: () => __awaiter(void 0, void 0, void 0, function* () { return yield commerceAPI.getProducts({ productIds: productIds.join(',') }); })
        }).do((products) => {
            return `got [ ${chalk_1.default.green(products.length)} ] products for [ ${chalk_1.default.gray(productIds.length)} ] productIds`;
        });
        let customerGroupOperation = yield Operation({
            tag: `👨‍👩‍👧‍👦  get customer groups`,
            execute: () => __awaiter(void 0, void 0, void 0, function* () { return yield commerceAPI.getCustomerGroups({}); })
        }).do((customerGroups) => {
            return `got [ ${chalk_1.default.green(customerGroups.length)} ]`;
        });
        const logOperation = (operation) => {
            logger_1.default.info(`[ ${chalk_1.default.blueBright(operation.tag)} ] [ ${chalk_1.default.cyan(operation.duration)} ] ${operation.status}`);
        };
        logOperation(megaMenuOperation);
        logOperation(categoryOperation);
        logOperation(productOperation);
        logOperation(productsOperation);
        logOperation(customerGroupOperation);
        let noProductCategories = lodash_1.default.filter(flattenedCategories, cat => { var _a; return ((_a = cat.products) === null || _a === void 0 ? void 0 : _a.length) === 0; });
        logger_1.default.info(`${(0, utils_1.formatPercentage)(noProductCategories, flattenedCategories)} categories with no products`);
        let noImageProducts = lodash_1.default.filter(allProducts, prod => lodash_1.default.isEmpty(lodash_1.default.flatten(lodash_1.default.map(prod.variants, 'images'))));
        logger_1.default.info(`${(0, utils_1.formatPercentage)(noImageProducts, allProducts)} products with no image`);
        let noPriceProducts = lodash_1.default.filter(allProducts, prod => { var _a; return ((_a = prod.variants[0]) === null || _a === void 0 ? void 0 : _a.listPrice) === '--'; });
        logger_1.default.info(`${(0, utils_1.formatPercentage)(noPriceProducts, allProducts)} products with no price`);
    }
    catch (error) {
        logger_1.default.error(`testing integration for [ ${item.body._meta.schema} ]: ${chalk_1.default.red('failed')}: ${error}`);
        console.log(error.stack);
    }
});
const checkIntegration = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let integrationItems = yield getIntegrationItems(context);
    let item = integrationItems.pop();
    if (item) {
        yield checkCommerceIntegration(item, context);
    }
});
const builder = (yargs) => (0, amplience_builder_1.default)(yargs)
    .demandCommand()
    .options({
    showMegaMenu: {
        alias: 'm',
        describe: 'show the mega menu structure',
        type: 'boolean'
    }
})
    .command("list", "List integrations", {}, listIntegrations)
    .command("check", "Check integration", {}, checkIntegration)
    .help();
exports.builder = builder;
