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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentTypeWithRepositoryAssignments = exports.resolveSchemaBody = exports.resolveSchemaId = void 0;
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const json_resolver_1 = require("./json-resolver");
const resolveSchemaId = (schema) => (schema.$id !== undefined ? schema.$id : schema.id);
exports.resolveSchemaId = resolveSchemaId;
const resolveSchemaBody = (schemas, dir) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = {};
    const resolved = {};
    for (const [filename, contentTypeSchema] of Object.entries(schemas)) {
        if (contentTypeSchema.body) {
            try {
                contentTypeSchema.body = yield (0, json_resolver_1.jsonResolver)(contentTypeSchema.body, dir);
                if (!contentTypeSchema.schemaId) {
                    const parsedBody = JSON.parse(contentTypeSchema.body);
                    const schemaId = (0, exports.resolveSchemaId)(parsedBody);
                    if (schemaId) {
                        contentTypeSchema.schemaId = schemaId;
                    }
                }
            }
            catch (err) {
                errors[filename] = err;
            }
        }
        resolved[filename] = contentTypeSchema;
    }
    return [resolved, errors];
});
exports.resolveSchemaBody = resolveSchemaBody;
class ContentTypeWithRepositoryAssignments extends dc_management_sdk_js_1.ContentType {
}
exports.ContentTypeWithRepositoryAssignments = ContentTypeWithRepositoryAssignments;
