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
exports.ContentTypeHandler = exports.validateNoDuplicateContentTypeUris = void 0;
const resource_handler_1 = require("./resource-handler");
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = require("../common/logger");
const chalk_1 = __importDefault(require("chalk"));
const importer_1 = require("../helpers/importer");
const schema_helper_1 = require("../helpers/schema-helper");
const fs_extra_1 = __importDefault(require("fs-extra"));
const logger_2 = require("../common/logger");
const prompts_1 = require("../common/prompts");
const validateNoDuplicateContentTypeUris = (importedContentTypes) => {
    const uriToFilenameMap = new Map();
    for (const [filename, contentType] of Object.entries(importedContentTypes)) {
        if (contentType.contentTypeUri) {
            const otherFilenames = uriToFilenameMap.get(contentType.contentTypeUri) || [];
            if (filename) {
                uriToFilenameMap.set(contentType.contentTypeUri, [...otherFilenames, filename]);
            }
        }
    }
    const uniqueDuplicateUris = [];
    uriToFilenameMap.forEach((filenames, uri) => {
        if (filenames.length > 1) {
            uniqueDuplicateUris.push([uri, filenames]);
        }
    });
    if (uniqueDuplicateUris.length > 0) {
        throw new Error(`Content Types must have unique uri values. Duplicate values found:-\n${uniqueDuplicateUris
            .map(([uri, filenames]) => `  uri: '${uri}' in files: [${filenames.map(f => `'${f}'`).join(', ')}]`)
            .join('\n')}`);
    }
};
exports.validateNoDuplicateContentTypeUris = validateNoDuplicateContentTypeUris;
let synchronizedCount = 0;
let archiveCount = 0;
let updateCount = 0;
let createCount = 0;
let assignedCount = 0;
const installTypes = (context, types) => __awaiter(void 0, void 0, void 0, function* () {
    const activeContentTypes = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.contentTypes.list, { status: 'ACTIVE' });
    const archivedContentTypes = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.contentTypes.list, { status: 'ARCHIVED' });
    const storedContentTypes = [...activeContentTypes, ...archivedContentTypes];
    yield Promise.all(types.map((fileContentType) => __awaiter(void 0, void 0, void 0, function* () {
        let stored = lodash_1.default.find(storedContentTypes, ct => ct.contentTypeUri === fileContentType.contentTypeUri);
        if (stored) {
            if (stored.status === 'ARCHIVED') {
                stored = yield stored.related.unarchive();
                archiveCount++;
                (0, logger_2.logUpdate)(`${prompts_1.prompts.unarchive} content type [ ${chalk_1.default.gray(fileContentType.contentTypeUri)} ]`);
            }
            stored.settings = fileContentType.settings;
            stored = yield stored.related.update(stored);
            updateCount++;
            (0, logger_2.logUpdate)(`${prompts_1.prompts.update} content type [ ${chalk_1.default.gray(fileContentType.contentTypeUri)} ]`);
        }
        else {
            stored = (yield context.hub.related.contentTypes.register(fileContentType));
            createCount++;
            (0, logger_2.logUpdate)(`${prompts_1.prompts.create} content type [ ${chalk_1.default.gray(fileContentType.contentTypeUri)} ]`);
        }
    })));
    let repos = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.contentRepositories.list);
    let activeTypes = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.contentTypes.list, { status: 'ACTIVE' });
    yield Promise.all(repos.map((repo) => __awaiter(void 0, void 0, void 0, function* () {
        yield Promise.all(types.map((fileContentType) => __awaiter(void 0, void 0, void 0, function* () {
            fileContentType.repositories = fileContentType.repositories || ['sitestructure'];
            let activeType = lodash_1.default.find(activeTypes, type => type.contentTypeUri === fileContentType.contentTypeUri);
            if (activeType && lodash_1.default.includes(fileContentType.repositories, repo.name)) {
                assignedCount++;
                (0, logger_2.logUpdate)(`${prompts_1.prompts.assign} content type [ ${chalk_1.default.grey(fileContentType.contentTypeUri)} ]`);
                yield repo.related.contentTypes.assign(activeType.id);
            }
        })));
    })));
    yield Promise.all(lodash_1.default.filter(activeTypes, t => lodash_1.default.includes(lodash_1.default.map(types, 'contentTypeUri'), t.contentTypeUri)).map((type) => __awaiter(void 0, void 0, void 0, function* () {
        synchronizedCount++;
        yield type.related.contentTypeSchema.update();
        (0, logger_2.logUpdate)(`${prompts_1.prompts.sync} content type [ ${chalk_1.default.gray(type.contentTypeUri)} ]`);
    })));
});
class ContentTypeHandler extends resource_handler_1.CleanableResourceHandler {
    constructor() {
        super(dc_management_sdk_js_1.ContentType, 'contentTypes');
        this.sortPriority = 1.1;
        this.icon = '🗂';
        synchronizedCount = 0;
        archiveCount = 0;
        updateCount = 0;
        createCount = 0;
        assignedCount = 0;
    }
    import(context) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, logger_1.logSubheading)(`[ import ] content-types`);
            let sourceDir = `${context.tempDir}/content/content-types`;
            if (!fs_extra_1.default.existsSync(sourceDir)) {
                return;
            }
            yield installTypes(context, (0, dc_demostore_integration_1.getCodecs)(dc_demostore_integration_1.CodecType.commerce).map(dc_demostore_integration_1.getContentType));
            const jsonTypes = (0, importer_1.loadJsonFromDirectory)(sourceDir, schema_helper_1.ContentTypeWithRepositoryAssignments);
            if (Object.keys(jsonTypes).length === 0) {
                throw new Error(`No content types found in ${sourceDir}`);
            }
            (0, exports.validateNoDuplicateContentTypeUris)(jsonTypes);
            yield installTypes(context, lodash_1.default.filter(Object.values(jsonTypes), s => !lodash_1.default.includes(lodash_1.default.map((0, dc_demostore_integration_1.getCodecs)(dc_demostore_integration_1.CodecType.commerce), 'schema.uri'), s.contentTypeUri)));
            (0, logger_2.logComplete)(`${this.getDescription()}: [ ${chalk_1.default.green(archiveCount)} unarchived ] [ ${chalk_1.default.green(updateCount)} updated ] [ ${chalk_1.default.green(createCount)} created ] [ ${chalk_1.default.green(synchronizedCount)} synced ]`);
        });
    }
    cleanup(context) {
        const _super = Object.create(null, {
            cleanup: { get: () => super.cleanup }
        });
        return __awaiter(this, void 0, void 0, function* () {
            (0, logger_1.logSubheading)(`[ cleanup ] content-types`);
            let repos = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.contentRepositories.list);
            let unassignedCount = 0;
            yield Promise.all(repos.map((repo) => __awaiter(this, void 0, void 0, function* () {
                let repoTypes = repo.contentTypes;
                if (repoTypes) {
                    yield Promise.all(repoTypes.map((type) => __awaiter(this, void 0, void 0, function* () {
                        unassignedCount++;
                        (0, logger_2.logUpdate)(`${prompts_1.prompts.unassign} content type [ ${chalk_1.default.grey(type.contentTypeUri)} ]`);
                        yield repo.related.contentTypes.unassign(type.hubContentTypeId);
                    })));
                }
            })));
            (0, logger_2.logComplete)(`${chalk_1.default.cyan(`📦  repositories`)}: [ ${chalk_1.default.red(unassignedCount)} content types unassigned ]`);
            yield _super.cleanup.call(this, context);
        });
    }
}
exports.ContentTypeHandler = ContentTypeHandler;
