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
exports.AmplienceSchemaValidator = exports.defaultSchemaLookup = void 0;
const ajv_1 = __importDefault(require("ajv"));
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
function defaultSchemaLookup(types, schemas) {
    return (uri) => __awaiter(this, void 0, void 0, function* () {
        const type = types.find(x => x.contentTypeUri === uri);
        let schema;
        if (type !== undefined) {
            try {
                const cached = (yield type.related.contentTypeSchema.get()).cachedSchema;
                schema = new dc_management_sdk_js_1.ContentTypeSchema({
                    body: JSON.stringify(cached),
                    schemaId: cached.id
                });
            }
            catch (_a) {
            }
        }
        if (schema === undefined) {
            schema = schemas.find(x => x.schemaId === uri);
        }
        return schema;
    });
}
exports.defaultSchemaLookup = defaultSchemaLookup;
class AmplienceSchemaValidator {
    constructor(schemaLookup) {
        this.schemaLookup = schemaLookup;
        this.schemas = [];
        this.loadSchema = (uri) => __awaiter(this, void 0, void 0, function* () {
            let internal = this.schemas.find(schema => schema.schemaId == uri);
            if (internal !== undefined) {
                return JSON.parse(internal.body);
            }
            internal = yield this.schemaLookup(uri);
            let body;
            if (internal === undefined) {
                try {
                    const result = yield (yield fetch(uri)).text();
                    body = JSON.parse(result.trim());
                }
                catch (e) {
                    return false;
                }
            }
            else {
                body = JSON.parse(internal.body);
                this.schemas.push(internal);
            }
            return body;
        });
        const ajv = new ajv_1.default({
            loadSchema: this.loadSchema.bind(this),
        });
        const draft4 = require('ajv/lib/refs/json-schema-draft-04.json');
        ajv.addMetaSchema(draft4);
        ajv.addMetaSchema(draft4, 'http://bigcontent.io/cms/schema/v1/schema.json');
        this.ajv = ajv;
        this.cache = new Map();
    }
    getValidatorCached(body) {
        const schemaId = body._meta.schema;
        const cacheResult = this.cache.get(schemaId);
        if (cacheResult != null) {
            return cacheResult;
        }
        const validator = (() => __awaiter(this, void 0, void 0, function* () {
            const schema = yield this.loadSchema(schemaId);
            if (schema && typeof schema === 'object') {
                return yield this.ajv.compileAsync(schema);
            }
            else {
                throw new Error('Could not find Content Type Schema!');
            }
        }))();
        this.cache.set(schemaId, validator);
        return validator;
    }
    validate(body) {
        return __awaiter(this, void 0, void 0, function* () {
            const validator = yield this.getValidatorCached(body);
            const result = validator(body);
            return result ? [] : validator.errors || [];
        });
    }
}
exports.AmplienceSchemaValidator = AmplienceSchemaValidator;
