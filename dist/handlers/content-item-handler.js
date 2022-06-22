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
exports.ContentItemHandler = void 0;
const resource_handler_1 = require("./resource-handler");
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = require("../common/prompts");
const fs_extra_1 = __importDefault(require("fs-extra"));
const logger_1 = __importStar(require("../common/logger"));
const lodash_1 = __importDefault(require("lodash"));
const utils_1 = require("../common/utils");
const nanoid_1 = require("nanoid");
const dc_cli_content_item_handler_1 = __importDefault(require("./dc-cli-content-item-handler"));
const log_helpers_1 = require("../common/dccli/log-helpers");
const types_1 = require("../common/types");
class ContentItemHandler extends resource_handler_1.ResourceHandler {
    constructor() {
        super(dc_management_sdk_js_1.ContentItem, 'contentItems');
        this.sortPriority = 0.03;
        this.icon = '📄';
    }
    import(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const automation = yield (yield context.amplienceHelper.getAutomation()).body;
            fs_extra_1.default.writeJsonSync(`${context.tempDir}/mapping.json`, {
                contentItems: lodash_1.default.map(automation.contentItems, ci => [ci.from, ci.to]),
                workflowStates: lodash_1.default.map(automation.workflowStates, ws => [ws.from, ws.to])
            });
            context.automation = automation;
            fs_extra_1.default.copyFileSync(`${context.tempDir}/mapping.json`, `${context.tempDir}/old_mapping.json`);
            logger_1.default.info(`wrote mapping file at ${context.tempDir}/mapping.json`);
            let sourceDir = `${context.tempDir}/content/content-items`;
            if (!fs_extra_1.default.existsSync(sourceDir)) {
                throw new Error(`source dir not found: ${sourceDir}`);
            }
            yield (0, utils_1.fileIterator)(sourceDir, yield (0, types_1.getMapping)(context)).iterate((file) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                let mapping = lodash_1.default.find((_a = context.automation) === null || _a === void 0 ? void 0 : _a.contentItems, map => map.from === file.object.id);
                if (mapping) {
                    let contentItem = yield context.amplienceHelper.getContentItem(mapping.to);
                    if (lodash_1.default.isEqual(contentItem.body, file.object.body)) {
                        fs_extra_1.default.unlinkSync(file.path);
                    }
                }
            }));
            let importLogFile = `${context.tempDir}/item-import.log`;
            yield (0, dc_cli_content_item_handler_1.default)({
                dir: sourceDir,
                logFile: (0, log_helpers_1.createLog)(importLogFile),
                clientId: context.environment.dc.clientId,
                clientSecret: context.environment.dc.clientSecret,
                hubId: context.environment.dc.hubId,
                mapFile: `${context.tempDir}/mapping.json`
            });
            let logFile = fs_extra_1.default.readFileSync(importLogFile, { encoding: "utf-8" });
            let createdCount = lodash_1.default.filter(logFile.split('\n'), l => l.startsWith('CREATE ')).length;
            let updatedCount = lodash_1.default.filter(logFile.split('\n'), l => l.startsWith('UPDATE ')).length;
            (0, logger_1.logComplete)(`${this.getDescription()}: [ ${chalk_1.default.green(createdCount)} created ] [ ${chalk_1.default.blue(updatedCount)} updated ]`);
            yield context.amplienceHelper.publishAll();
            yield context.amplienceHelper.cacheContentMap();
            yield context.amplienceHelper.updateAutomation();
        });
    }
    shouldCleanUpItem(item, context) {
        return lodash_1.default.includes(context.matchingSchema, item.body._meta.schema) || lodash_1.default.isEmpty(context.matchingSchema);
    }
    cleanup(context) {
        return __awaiter(this, void 0, void 0, function* () {
            let repositories = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.contentRepositories.list);
            let contentTypes = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.contentTypes.list);
            let archiveCount = 0;
            let folderCount = 0;
            yield Promise.all(repositories.map((repository) => __awaiter(this, void 0, void 0, function* () {
                (0, logger_1.logUpdate)(`${prompts_1.prompts.archive} content items in repository ${chalk_1.default.cyanBright(repository.name)}...`);
                let contentItems = lodash_1.default.filter(yield (0, dc_demostore_integration_1.paginator)(repository.related.contentItems.list, { status: 'ACTIVE' }), ci => this.shouldCleanUpItem(ci, context));
                yield Promise.all(contentItems.map((contentItem) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c;
                    let contentType = lodash_1.default.find(contentTypes, ct => ct.contentTypeUri === contentItem.body._meta.schema);
                    let effectiveContentTypeLink = lodash_1.default.get(contentType, '_links.effective-content-type.href');
                    if (!effectiveContentTypeLink) {
                        return;
                    }
                    let effectiveContentType = yield context.amplienceHelper.get(effectiveContentTypeLink);
                    if ((_a = effectiveContentType === null || effectiveContentType === void 0 ? void 0 : effectiveContentType.properties) === null || _a === void 0 ? void 0 : _a.filterActive) {
                        contentItem.body.filterActive = false;
                        contentItem = yield contentItem.related.update(contentItem);
                        yield context.amplienceHelper.publishContentItem(contentItem);
                    }
                    if (((_b = contentItem.body._meta.deliveryKey) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                        if (contentItem.status === 'ARCHIVED') {
                            contentItem = yield contentItem.related.unarchive();
                        }
                        if (!lodash_1.default.isEmpty(contentItem.body._meta.deliveryKey)) {
                            contentItem.body._meta.deliveryKey = `${contentItem.body._meta.deliveryKey}-${(0, nanoid_1.nanoid)()}`;
                        }
                        contentItem = yield contentItem.related.update(contentItem);
                    }
                    archiveCount++;
                    yield contentItem.related.archive();
                    lodash_1.default.remove((_c = context.automation) === null || _c === void 0 ? void 0 : _c.contentItems, ci => contentItem.id === ci.to);
                })));
                const cleanupFolder = ((folder) => __awaiter(this, void 0, void 0, function* () {
                    let subfolders = yield (0, dc_demostore_integration_1.paginator)(folder.related.folders.list);
                    yield Promise.all(subfolders.map(cleanupFolder));
                    (0, logger_1.logUpdate)(`${prompts_1.prompts.delete} folder ${folder.name}`);
                    folderCount++;
                    return yield context.amplienceHelper.deleteFolder(folder);
                }));
                let folders = yield (0, dc_demostore_integration_1.paginator)(repository.related.folders.list);
                yield Promise.all(folders.map(cleanupFolder));
            })));
            (0, logger_1.logComplete)(`${this.getDescription()}: [ ${chalk_1.default.yellow(archiveCount)} items archived ] [ ${chalk_1.default.red(folderCount)} folders deleted ]`);
        });
    }
}
exports.ContentItemHandler = ContentItemHandler;
