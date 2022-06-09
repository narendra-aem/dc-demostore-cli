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
exports.ContentTypeSchemaHandler = void 0;
const resource_handler_1 = require("./resource-handler");
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const lodash_1 = __importDefault(require("lodash"));
const chalk_1 = __importDefault(require("chalk"));
const importer_1 = require("../helpers/importer");
const schema_helper_1 = require("../helpers/schema-helper");
const fs_extra_1 = __importDefault(require("fs-extra"));
const logger_1 = require("../common/logger");
const content_type_handler_1 = require("./content-type-handler");
let archiveCount = 0;
let updateCount = 0;
let createCount = 0;
const installSchemas = (context, schemas) => __awaiter(void 0, void 0, void 0, function* () {
    const storedSchemas = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.contentTypeSchema.list);
    yield Promise.all(schemas.map((schema) => __awaiter(void 0, void 0, void 0, function* () {
        let stored = lodash_1.default.find(storedSchemas, s => s.schemaId === schema.schemaId);
        if (stored) {
            if (stored.status === 'ARCHIVED') {
                archiveCount++;
                stored = yield stored.related.unarchive();
                (0, logger_1.logUpdate)(`${chalk_1.default.green('unarch')} schema [ ${chalk_1.default.gray(schema.schemaId)} ]`);
            }
            if (schema.body && stored.body !== schema.body) {
                updateCount++;
                schema.body = JSON.stringify(JSON.parse(schema.body), undefined, 4);
                stored = yield stored.related.update(schema);
                (0, logger_1.logUpdate)(`${chalk_1.default.green('update')} schema [ ${chalk_1.default.gray(schema.schemaId)} ]`);
            }
        }
        else if (schema.body) {
            createCount++;
            schema.body = JSON.stringify(JSON.parse(schema.body), undefined, 4);
            stored = yield context.hub.related.contentTypeSchema.create(schema);
            (0, logger_1.logUpdate)(`${chalk_1.default.green('create')} schema [ ${chalk_1.default.gray(schema.schemaId)} ]`);
        }
    })));
});
class ContentTypeSchemaHandler extends resource_handler_1.CleanableResourceHandler {
    constructor() {
        super(dc_management_sdk_js_1.ContentTypeSchema, 'contentTypeSchema');
        this.sortPriority = 1.09;
        this.icon = '🗄';
        archiveCount = 0;
        updateCount = 0;
        createCount = 0;
    }
    import(context) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, logger_1.logSubheading)(`[ import ] content-type-schemas`);
            let baseDir = `${context.tempDir}/content`;
            let sourceDir = `${baseDir}/content-type-schemas`;
            if (!fs_extra_1.default.existsSync(sourceDir)) {
                return;
            }
            let codecs = (0, dc_demostore_integration_1.getCodecs)(dc_demostore_integration_1.CodecType.commerce);
            let codecSchemas = codecs.map(dc_demostore_integration_1.getContentTypeSchema);
            yield installSchemas(context, codecSchemas);
            const schemas = (0, importer_1.loadJsonFromDirectory)(sourceDir, dc_management_sdk_js_1.ContentTypeSchema);
            const [resolvedSchemas, resolveSchemaErrors] = yield (0, schema_helper_1.resolveSchemaBody)(schemas, sourceDir);
            const schemasToInstall = lodash_1.default.filter(Object.values(resolvedSchemas), s => !lodash_1.default.includes(lodash_1.default.map(codecs, 'schema.uri'), s.schemaId));
            if (Object.keys(resolveSchemaErrors).length > 0) {
                const errors = Object.entries(resolveSchemaErrors)
                    .map(value => {
                    const [filename, error] = value;
                    return `* ${filename} -> ${error}`;
                })
                    .join('\n');
                throw new Error(`Unable to resolve the body for the following files:\n${errors}`);
            }
            let demostoreConfigSchema = lodash_1.default.find(schemasToInstall, s => s.schemaId === 'https://demostore.amplience.com/site/demostoreconfig');
            if (demostoreConfigSchema === null || demostoreConfigSchema === void 0 ? void 0 : demostoreConfigSchema.body) {
                let schemaBody = JSON.parse(demostoreConfigSchema.body);
                schemaBody.properties.commerce.allOf = [{
                        "$ref": "http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference"
                    }, {
                        properties: {
                            contentType: {
                                enum: codecs.map(c => c.schema.uri)
                            }
                        }
                    }];
                demostoreConfigSchema.body = JSON.stringify(schemaBody);
            }
            yield installSchemas(context, schemasToInstall);
            (0, logger_1.logComplete)(`${this.getDescription()}: [ ${chalk_1.default.green(archiveCount)} unarchived ] [ ${chalk_1.default.green(updateCount)} updated ] [ ${chalk_1.default.green(createCount)} created ]`);
            yield new content_type_handler_1.ContentTypeHandler().import(context);
        });
    }
}
exports.ContentTypeSchemaHandler = ContentTypeSchemaHandler;
