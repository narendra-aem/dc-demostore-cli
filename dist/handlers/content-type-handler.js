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
exports.ContentTypeHandler = exports.validateNoDuplicateContentTypeUris = void 0;
const resource_handler_1 = require("./resource-handler");
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = __importStar(require("../common/logger"));
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
class ContentTypeHandler extends resource_handler_1.CleanableResourceHandler {
    constructor() {
        super(dc_management_sdk_js_1.ContentType, 'contentTypes');
        this.sortPriority = 1.1;
        this.icon = '🗂';
    }
    import(context) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logSubheading(`[ import ] content-types`);
            let { hub } = context;
            let sourceDir = `${context.tempDir}/content/content-types`;
            if (!fs_extra_1.default.existsSync(sourceDir)) {
                return;
            }
            const jsonTypes = importer_1.loadJsonFromDirectory(sourceDir, schema_helper_1.ContentTypeWithRepositoryAssignments);
            if (Object.keys(jsonTypes).length === 0) {
                throw new Error(`No content types found in ${sourceDir}`);
            }
            exports.validateNoDuplicateContentTypeUris(jsonTypes);
            const activeContentTypes = yield dc_demostore_integration_1.paginator(hub.related.contentTypes.list, { status: 'ACTIVE' });
            const archivedContentTypes = yield dc_demostore_integration_1.paginator(hub.related.contentTypes.list, { status: 'ARCHIVED' });
            const storedContentTypes = [...activeContentTypes, ...archivedContentTypes];
            let synchronizedCount = 0;
            let archiveCount = 0;
            let updateCount = 0;
            let createCount = 0;
            let fileContentTypes = lodash_1.default.map(Object.entries(jsonTypes), x => x[1]);
            yield Promise.all(fileContentTypes.map((fileContentType) => __awaiter(this, void 0, void 0, function* () {
                let stored = lodash_1.default.find(storedContentTypes, ct => ct.contentTypeUri === fileContentType.contentTypeUri);
                if (stored) {
                    if (stored.status === 'ARCHIVED') {
                        stored = yield stored.related.unarchive();
                        archiveCount++;
                        logger_2.logUpdate(`${prompts_1.prompts.unarchive} content type [ ${chalk_1.default.gray(fileContentType.contentTypeUri)} ]`);
                    }
                    stored.settings = fileContentType.settings;
                    stored = yield stored.related.update(stored);
                    updateCount++;
                    logger_2.logUpdate(`${prompts_1.prompts.update} content type [ ${chalk_1.default.gray(fileContentType.contentTypeUri)} ]`);
                }
                else {
                    stored = (yield hub.related.contentTypes.register(fileContentType));
                    createCount++;
                    logger_2.logUpdate(`${prompts_1.prompts.create} content type [ ${chalk_1.default.gray(fileContentType.contentTypeUri)} ]`);
                }
            })));
            let repos = yield dc_demostore_integration_1.paginator(hub.related.contentRepositories.list);
            let activeTypes = yield dc_demostore_integration_1.paginator(hub.related.contentTypes.list, { status: 'ACTIVE' });
            let unassignedCount = 0;
            let assignedCount = 0;
            yield Promise.all(repos.map((repo) => __awaiter(this, void 0, void 0, function* () {
                yield Promise.all(repo.contentTypes.map((type) => __awaiter(this, void 0, void 0, function* () {
                    let activeType = lodash_1.default.find(fileContentTypes, ft => ft.contentTypeUri === type.contentTypeUri);
                    if (!activeType) {
                        unassignedCount++;
                        logger_2.logUpdate(`${prompts_1.prompts.unassign} content type [ ${chalk_1.default.grey(type.contentTypeUri)} ]`);
                        yield repo.related.contentTypes.unassign(type.hubContentTypeId);
                    }
                })));
                yield Promise.all(fileContentTypes.map((fileContentType) => __awaiter(this, void 0, void 0, function* () {
                    let activeType = lodash_1.default.find(activeTypes, type => type.contentTypeUri === fileContentType.contentTypeUri);
                    if (activeType &&
                        lodash_1.default.includes(fileContentType.repositories, repo.name) &&
                        !lodash_1.default.includes(repo.contentTypes.map(x => x.contentTypeUri), fileContentType.contentTypeUri)) {
                        assignedCount++;
                        logger_2.logUpdate(`${prompts_1.prompts.assign} content type [ ${chalk_1.default.grey(fileContentType.contentTypeUri)} ]`);
                        yield repo.related.contentTypes.assign(activeType.id);
                    }
                })));
            })));
            yield Promise.all(lodash_1.default.filter(activeTypes, t => lodash_1.default.includes(lodash_1.default.map(fileContentTypes, 'contentTypeUri'), t.contentTypeUri)).map((type) => __awaiter(this, void 0, void 0, function* () {
                synchronizedCount++;
                yield type.related.contentTypeSchema.update();
                logger_2.logUpdate(`${prompts_1.prompts.sync} content type [ ${chalk_1.default.gray(type.contentTypeUri)} ]`);
            })));
            logger_2.logComplete(`${this.getDescription()}: [ ${chalk_1.default.green(archiveCount)} unarchived ] [ ${chalk_1.default.green(updateCount)} updated ] [ ${chalk_1.default.green(createCount)} created ] [ ${chalk_1.default.green(synchronizedCount)} synced ]`);
            logger_1.default.info(`${chalk_1.default.cyan('📦  repositories')}: [ ${chalk_1.default.green(assignedCount)} content types assigned ] [ ${chalk_1.default.red(unassignedCount)} content types unassigned ]`);
        });
    }
    cleanup(context) {
        const _super = Object.create(null, {
            cleanup: { get: () => super.cleanup }
        });
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logSubheading(`[ cleanup ] content-types`);
            let repos = yield dc_demostore_integration_1.paginator(context.hub.related.contentRepositories.list);
            let unassignedCount = 0;
            yield Promise.all(repos.map((repo) => __awaiter(this, void 0, void 0, function* () {
                let repoTypes = repo.contentTypes;
                if (repoTypes) {
                    yield Promise.all(repoTypes.map((type) => __awaiter(this, void 0, void 0, function* () {
                        unassignedCount++;
                        logger_2.logUpdate(`${prompts_1.prompts.unassign} content type [ ${chalk_1.default.grey(type.contentTypeUri)} ]`);
                        yield repo.related.contentTypes.unassign(type.hubContentTypeId);
                    })));
                }
            })));
            logger_2.logComplete(`${chalk_1.default.cyan(`📦  repositories`)}: [ ${chalk_1.default.red(unassignedCount)} content types unassigned ]`);
            yield _super.cleanup.call(this, context);
        });
    }
}
exports.ContentTypeHandler = ContentTypeHandler;
