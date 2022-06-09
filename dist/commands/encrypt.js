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
exports.command = 'encrypt';
exports.desc = "Encrypt credentials";
exports.builder = amplience_builder_1.default;
exports.handler = (0, middleware_1.contextHandler)((context) => __awaiter(void 0, void 0, void 0, function* () {
    let { hub } = context;
    let siteStructureContentItems = yield context.amplienceHelper.getContentItemsInRepository('sitestructure');
    let contentTypeSchemas = yield (0, dc_demostore_integration_1.paginator)(hub.related.contentTypeSchema.list, { status: 'ACTIVE' });
    yield Promise.all(siteStructureContentItems.map((ci) => __awaiter(void 0, void 0, void 0, function* () {
        if (ci.body._meta.schema.indexOf('/site/integration') > -1) {
            ci.body = Object.assign(Object.assign({}, ci.body), { _meta: Object.assign(Object.assign({}, ci.body._meta), { deliveryId: ci.deliveryId }) });
            let keeper = (0, dc_demostore_integration_1.CryptKeeper)(ci.body, hub.name);
            let schemaObject = contentTypeSchemas.find(schema => schema.schemaId === ci.body._meta.schema);
            if (schemaObject === null || schemaObject === void 0 ? void 0 : schemaObject.body) {
                let schema = JSON.parse(schemaObject.body);
                let encryptables = lodash_1.default.filter(lodash_1.default.map(schema.properties, (v, k) => (Object.assign(Object.assign({}, v), { key: k }))), prop => prop.maxLength === 200);
                if (encryptables.length > 0) {
                    lodash_1.default.each(encryptables, encryptable => {
                        ci.body[encryptable.key] = keeper.encrypt(ci.body[encryptable.key]);
                    });
                    ci = yield ci.related.update(ci);
                }
            }
        }
    })));
    yield context.amplienceHelper.publishAll();
}));
