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
exports.handler = exports.builder = exports.LOG_FILENAME = exports.desc = exports.command = exports.getDefaultMappingPath = void 0;
const dynamic_content_client_factory_1 = __importDefault(require("../common/dccli/dynamic-content-client-factory"));
const path_1 = require("path");
const fs_1 = require("fs");
const util_1 = require("util");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const content_mapping_1 = require("../common/dccli/content-mapping");
const content_dependency_tree_1 = require("../common/dccli/content-item/content-dependency-tree");
const amplience_schema_validator_1 = require("../common/dccli/content-item/amplience-schema-validator");
const log_helpers_1 = require("../common/dccli/log-helpers");
const question_helpers_1 = require("../common/dccli/question-helpers");
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = require("../common/logger");
function getDefaultMappingPath(name, platform = process.platform) {
    return (0, path_1.join)(process.env[platform == 'win32' ? 'USERPROFILE' : 'HOME'] || __dirname, '.amplience', `imports/`, `${name}.json`);
}
exports.getDefaultMappingPath = getDefaultMappingPath;
exports.command = 'import <dir>';
exports.desc = 'Import content items';
const LOG_FILENAME = (platform = process.platform) => (0, log_helpers_1.getDefaultLogPath)('item', 'import', platform);
exports.LOG_FILENAME = LOG_FILENAME;
const builder = (yargs) => {
    yargs
        .positional('dir', {
        describe: 'Directory containing content items to import. If this points to an export manifest, we will try and import the content with the same absolute path and repositories as the export.',
        type: 'string',
        requiresArg: true
    })
        .option('baseRepo', {
        type: 'string',
        describe: 'Import matching the given repository to the import base directory, by ID. Folder structure will be followed and replicated from there.'
    })
        .option('baseFolder', {
        type: 'string',
        describe: 'Import matching the given folder to the import base directory, by ID. Folder structure will be followed and replicated from there.'
    })
        .option('mapFile', {
        type: 'string',
        describe: 'Mapping file to use when updating content that already exists. Updated with any new mappings that are generated. If not present, will be created.'
    })
        .alias('f', 'force')
        .option('f', {
        type: 'boolean',
        boolean: true,
        describe: 'Overwrite content, create and assign content types, and ignore content with missing types/references without asking.'
    })
        .alias('v', 'validate')
        .option('v', {
        type: 'boolean',
        boolean: true,
        describe: 'Only recreate folder structure - content is validated but not imported.'
    })
        .option('skipIncomplete', {
        type: 'boolean',
        boolean: true,
        describe: 'Skip any content items that has one or more missing dependency.'
    })
        .option('publish', {
        type: 'boolean',
        boolean: true,
        describe: 'Publish any content items that either made a new version on import, or were published more recently in the JSON.'
    })
        .option('republish', {
        type: 'boolean',
        boolean: true,
        describe: 'Republish content items regardless of whether the import changed them or not. (--publish not required)'
    })
        .option('excludeKeys', {
        type: 'boolean',
        boolean: true,
        describe: 'Exclude delivery keys when importing content items.'
    })
        .option('media', {
        type: 'boolean',
        boolean: true,
        describe: "Detect and rewrite media links to match assets in the target account's DAM. Your client must have DAM permissions configured."
    })
        .option('logFile', {
        type: 'string',
        default: exports.LOG_FILENAME,
        describe: 'Path to a log file to write to.',
        coerce: log_helpers_1.createLog
    });
};
exports.builder = builder;
const getSubfolders = (context, folder) => {
    if (context.folderToSubfolderMap.has(folder.id)) {
        return context.folderToSubfolderMap.get(folder.id);
    }
    const subfolders = (0, dc_demostore_integration_1.paginator)(folder.related.folders.list);
    context.folderToSubfolderMap.set(folder.id, subfolders);
    return subfolders;
};
let getOrCreateFolderCached;
const getOrCreateFolder = (context, rel) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parentPath = (0, path_1.dirname)(rel);
        const parent = yield getOrCreateFolderCached(context, (0, path_1.resolve)(context.baseDir, parentPath));
        const folderInfo = {
            name: (0, path_1.basename)(rel)
        };
        const container = parent == null ? context.rootFolders : yield getSubfolders(context, parent);
        let result = container.find(target => target.name === folderInfo.name);
        const containerName = parent == null ? context.repo.label : parent.name;
        if (result == null) {
            if (parent == null) {
                result = yield context.repo.related.folders.create(new dc_management_sdk_js_1.Folder(folderInfo));
            }
            else {
                result = yield parent.related.folders.create(new dc_management_sdk_js_1.Folder(folderInfo));
            }
            (0, logger_1.logUpdate)(`Created folder in ${containerName}: '${rel}'.`);
        }
        else {
            (0, logger_1.logUpdate)(`Found existing subfolder in ${containerName}: '${rel}'.`);
        }
        return result;
    }
    catch (e) {
        (0, logger_1.logUpdate)(`Couldn't get or create folder ${rel}! ${e.toString()}`);
        throw e;
    }
});
getOrCreateFolderCached = (context, path) => __awaiter(void 0, void 0, void 0, function* () {
    let rel = (0, path_1.relative)(context.baseDir, path);
    if (rel === '') {
        rel = '.';
    }
    if (context.pathToFolderMap.has(rel)) {
        return yield context.pathToFolderMap.get(rel);
    }
    const resultPromise = getOrCreateFolder(context, rel);
    context.pathToFolderMap.set(rel, resultPromise);
    const result = yield resultPromise;
    return result;
});
const traverseRecursive = (path, action) => __awaiter(void 0, void 0, void 0, function* () {
    const dir = yield (0, util_1.promisify)(fs_1.readdir)(path);
    yield Promise.all(dir.map((contained) => __awaiter(void 0, void 0, void 0, function* () {
        contained = (0, path_1.join)(path, contained);
        const stat = yield (0, util_1.promisify)(fs_1.lstat)(contained);
        return yield (stat.isDirectory() ? traverseRecursive(contained, action) : action(contained));
    })));
});
const createOrUpdateContent = (client, repo, existing, item) => __awaiter(void 0, void 0, void 0, function* () {
    let oldItem = null;
    if (typeof existing === 'string') {
        oldItem = yield client.contentItems.get(existing);
    }
    else {
        oldItem = existing;
    }
    let result;
    let locale = item.locale;
    item.locale = undefined;
    if (oldItem == null) {
        result = { newItem: yield repo.related.contentItems.create(item), oldVersion: 0 };
    }
    else {
        const oldVersion = oldItem.version || 0;
        item.version = oldItem.version;
        if (oldItem.status !== dc_management_sdk_js_1.Status.ACTIVE) {
            oldItem = yield oldItem.related.unarchive();
        }
        result = { newItem: yield oldItem.related.update(item), oldVersion };
    }
    if (locale != null && result.newItem.locale != locale) {
        locale = (yield result.newItem.related.setLocale(locale)).locale;
    }
    item.locale = locale;
    return result;
});
const itemShouldPublish = (item, newItem, updated) => {
    const sourceDate = item.lastPublish;
    const targetDate = newItem.lastPublishedDate;
    return sourceDate && (updated || !targetDate || new Date(targetDate) < new Date(sourceDate));
};
const trySaveMapping = (mapFile, mapping, log) => __awaiter(void 0, void 0, void 0, function* () {
    if (mapFile != null) {
        try {
            yield mapping.save(mapFile);
        }
        catch (e) {
            log.appendLine(`Failed to save the mapping. ${e.toString()}`);
        }
    }
});
const prepareContentForImport = (client, hub, repos, folder, mapping, log, argv) => __awaiter(void 0, void 0, void 0, function* () {
    const { force, skipIncomplete } = argv;
    const contexts = new Map();
    repos.forEach(repo => {
        const pathToFolderMap = new Map();
        if (folder != null) {
            pathToFolderMap.set('.', Promise.resolve(folder));
        }
        else {
            pathToFolderMap.set('.', Promise.resolve(null));
        }
        contexts.set(repo.repo, {
            client,
            hub,
            repo: repo.repo,
            pathToFolderMap,
            baseDir: (0, path_1.resolve)(repo.basePath),
            folderToSubfolderMap: new Map(),
            mapping,
            rootFolders: [],
            log
        });
    });
    let contentItems = [];
    const schemaNames = new Set();
    for (let i = 0; i < repos.length; i++) {
        const repo = repos[i].repo;
        const context = contexts.get(repo);
        try {
            const folders = yield (0, dc_demostore_integration_1.paginator)(repo.related.folders.list);
            for (let j = 0; j < folders.length; j++) {
                const folder = folders[j];
                let parent = null;
                try {
                    parent = yield folder.related.folders.parent();
                }
                catch (_a) {
                }
                if (parent == null) {
                    context.rootFolders.push(folder);
                }
            }
        }
        catch (e) {
            log.error(`Could not get base folders for repository ${repo.label}: `, e);
            return null;
        }
        (0, logger_1.logUpdate)(`Scanning structure and content in '${repos[i].basePath}' for repository '${repo.label}'...`);
        yield traverseRecursive((0, path_1.resolve)(repos[i].basePath), (path) => __awaiter(void 0, void 0, void 0, function* () {
            if ((0, path_1.extname)(path) !== '.json') {
                return;
            }
            let contentJSON;
            try {
                const contentText = yield (0, util_1.promisify)(fs_1.readFile)(path, { encoding: 'utf8' });
                contentJSON = JSON.parse(contentText);
            }
            catch (e) {
                log.appendLine(`Couldn't read content item at '${path}': ${e.toString()}`);
                return;
            }
            const folder = yield getOrCreateFolderCached(context, (0, path_1.dirname)(path));
            const filteredContent = {
                id: contentJSON.id,
                label: contentJSON.label,
                locale: contentJSON.locale,
                body: contentJSON.body,
                deliveryId: contentJSON.deliveryId == contentJSON.Id || argv.excludeKeys ? undefined : contentJSON.deliveryId,
                folderId: folder == null ? null : folder.id,
                lastPublish: contentJSON.lastPublishedDate
            };
            if (argv.excludeKeys) {
                delete filteredContent.body._meta.deliveryKey;
            }
            schemaNames.add(contentJSON.body._meta.schema);
            contentItems.push({ repo: repo, content: new dc_management_sdk_js_1.ContentItem(filteredContent) });
        }));
    }
    (0, logger_1.logUpdate)('Done. Validating content...');
    const alreadyExists = contentItems.filter(item => mapping.getContentItem(item.content.id) != null);
    if (alreadyExists.length > 0) {
        const updateExisting = force ||
            (yield (0, question_helpers_1.asyncQuestion)(`${alreadyExists.length} of the items being imported already exist in the mapping. Would you like to update these content items instead of skipping them? (y/n) `, log));
        if (!updateExisting) {
            contentItems = contentItems.filter(item => mapping.getContentItem(item.content.id) == null);
        }
    }
    let types;
    let schemas;
    try {
        types = yield (0, dc_demostore_integration_1.paginator)(hub.related.contentTypes.list);
        schemas = yield (0, dc_demostore_integration_1.paginator)(hub.related.contentTypeSchema.list);
    }
    catch (e) {
        log.error('Could not load content types:', e);
        return null;
    }
    const typesBySchema = new Map(types.map(type => [type.contentTypeUri, type]));
    const missingTypes = Array.from(schemaNames).filter(name => {
        return !typesBySchema.has(name);
    });
    if (missingTypes.length > 0) {
        const existing = schemas.filter(schema => missingTypes.indexOf(schema.schemaId) !== -1);
        log.appendLine('Required content types are missing from the target hub.');
        if (existing.length > 0) {
            log.appendLine('The following required content types schemas exist, but do not exist as content types:');
            existing.forEach(schema => {
                log.appendLine(`  ${schema.schemaId}`);
            });
            const create = force ||
                (yield (0, question_helpers_1.asyncQuestion)('Content types can be automatically created for these schemas, but it is not recommended as they will have a default name and lack any configuration. Are you sure you wish to continue? (y/n) ', log));
            if (!create) {
                return null;
            }
            log.warn(`Creating ${existing.length} missing content types.`);
            for (let i = 0; i < existing.length; i++) {
                const missing = existing[i];
                let type = new dc_management_sdk_js_1.ContentType({
                    contentTypeUri: missing.schemaId,
                    settings: { label: (0, path_1.basename)(missing.schemaId) }
                });
                type = yield hub.related.contentTypes.register(type);
                types.push(type);
                typesBySchema.set(missing.schemaId, type);
            }
        }
    }
    const repom = new Map();
    contentItems.forEach(item => {
        let repoSet = repom.get(item.repo);
        if (repoSet == null) {
            repoSet = new Set();
            repom.set(item.repo, repoSet);
        }
        const type = typesBySchema.get(item.content.body._meta.schema);
        if (type != null) {
            repoSet.add(type);
        }
    });
    const missingRepoAssignments = [];
    Array.from(repom).forEach(([repo, expectedTypes]) => {
        const expectedTypesArray = Array.from(expectedTypes);
        const missingTypes = expectedTypesArray.filter(expectedType => (repo.contentTypes || []).find(type => type.hubContentTypeId == expectedType.id) == null);
        missingTypes.forEach(missingType => missingRepoAssignments.push([repo, missingType]));
    });
    if (missingRepoAssignments.length > 0) {
        log.appendLine('Some content items are using types incompatible with the target repository. Missing assignments:');
        missingRepoAssignments.forEach(([repo, type]) => {
            let label = '<no label>';
            if (type.settings && type.settings.label) {
                label = type.settings.label;
            }
            log.appendLine(`  ${repo.label} - ${label} (${type.contentTypeUri})`);
        });
        const createAssignments = force ||
            (yield (0, question_helpers_1.asyncQuestion)('These assignments will be created automatically. Are you sure you still wish to continue? (y/n) ', log));
        if (!createAssignments) {
            return null;
        }
        log.warn(`Creating ${missingRepoAssignments.length} missing repo assignments.`);
        try {
            yield Promise.all(missingRepoAssignments.map(([repo, type]) => repo.related.contentTypes.assign(type.id)));
        }
        catch (e) {
            log.error('Failed creating repo assignments:', e);
            return null;
        }
    }
    const tree = new content_dependency_tree_1.ContentDependencyTree(contentItems, mapping);
    const missingSchema = tree.requiredSchema.filter((schemaId) => schemas.findIndex(schema => schema.schemaId === schemaId) === -1 &&
        types.findIndex(type => type.contentTypeUri === schemaId) === -1);
    if (missingSchema.length > 0) {
        log.appendLine('Required content type schema are missing from the target hub:');
        missingSchema.forEach((schema) => log.appendLine(`  ${schema}`));
        log.appendLine('All content referencing this content type schema, and any content depending on those items will be skipped.');
        const affectedContentItems = tree.filterAny((item) => {
            return missingSchema.indexOf(item.owner.content.body._meta.schema) !== -1;
        });
        const beforeRemove = tree.all.length;
        tree.removeContent(affectedContentItems);
        if (tree.all.length === 0) {
            log.error('No content remains after removing those with missing content type schemas. Aborting.');
            return null;
        }
        const ignore = force ||
            (yield (0, question_helpers_1.asyncQuestion)(`${affectedContentItems.length} out of ${beforeRemove} content items will be skipped. Are you sure you still wish to continue? (y/n) `, log));
        if (!ignore) {
            return null;
        }
        log.warn(`Skipping ${missingRepoAssignments.length} content items due to missing schemas.`);
    }
    const missingIDs = new Set();
    const invalidContentItems = tree.filterAny((item) => {
        const missingDeps = item.dependencies.filter((dep) => !tree.byId.has(dep.dependency.id) && mapping.getContentItem(dep.dependency.id) == null);
        missingDeps.forEach((dep) => {
            if (dep.dependency.id != null) {
                missingIDs.add(dep.dependency.id);
            }
        });
        return missingDeps.length > 0;
    });
    if (invalidContentItems.length > 0) {
        if (skipIncomplete) {
            tree.removeContent(invalidContentItems);
        }
        else {
            const validator = new amplience_schema_validator_1.AmplienceSchemaValidator((0, amplience_schema_validator_1.defaultSchemaLookup)(types, schemas));
            const mustSkip = [];
            yield Promise.all(invalidContentItems.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                tree.removeContentDependenciesFromBody(item.owner.content.body, item.dependencies.map((dependency) => dependency.dependency));
                try {
                    const errors = yield validator.validate(item.owner.content.body);
                    if (errors.length > 0) {
                        mustSkip.push(item);
                    }
                }
                catch (_b) {
                }
            })));
            if (mustSkip.length > 0) {
                log.appendLine('Required dependencies for the following content items are missing, and would cause validation errors if set null.');
                log.appendLine('These items will be skipped:');
                mustSkip.forEach(item => log.appendLine(`  ${item.owner.content.label}`));
                tree.removeContent(mustSkip);
            }
        }
        log.appendLine('Referenced content items (targets of links/references) are missing from the import and mapping:');
        missingIDs.forEach(id => log.appendLine(`  ${id}`));
        const action = skipIncomplete ? 'skipped' : 'set as null';
        log.appendLine(`All references to these content items will be ${action}. Note: if you have already imported these items before, make sure you are using a mapping file from that import.`);
        if (tree.all.length === 0) {
            log.appendLine('No content remains after removing those with missing dependencies. Aborting.');
            return null;
        }
        invalidContentItems.forEach((item) => log.appendLine(`  ${item.owner.content.label}`));
        const ignore = force ||
            (yield (0, question_helpers_1.asyncQuestion)(`${invalidContentItems.length} out of ${contentItems.length} content items will be affected. Are you sure you still wish to continue? (y/n) `, log));
        if (!ignore) {
            return null;
        }
        log.warn(`${invalidContentItems.length} content items ${action} due to missing references.`);
    }
    (0, logger_1.logUpdate)(`Found ${tree.levels.length} dependency levels in ${tree.all.length} items, ${tree.circularLinks.length} referencing a circular dependency.`);
    (0, logger_1.logUpdate)(`Importing ${tree.all.length} content items...`);
    return tree;
});
const rewriteDependency = (dep, mapping, allowNull) => {
    let id = mapping.getContentItem(dep.dependency.id);
    if (id == null && !allowNull) {
        id = dep.dependency.id;
    }
    if (dep.dependency._meta.schema === '_hierarchy') {
        dep.owner.content.body._meta.hierarchy.parentId = id;
    }
    else if (dep.parent) {
        const parent = dep.parent;
        if (id == null) {
            delete parent[dep.index];
        }
        else {
            parent[dep.index] = dep.dependency;
            dep.dependency.id = id;
        }
    }
};
const sortDependencies = (a, b) => {
    if (lodash_1.default.includes(lodash_1.default.map(a.dependents, (d) => d.resolved && d.resolved.owner.content.id), b.owner.content.id)) {
        return -1;
    }
    else if (lodash_1.default.includes(lodash_1.default.map(b.dependents, (d) => d.resolved && d.resolved.owner.content.id), a.owner.content.id)) {
        return 1;
    }
    return a.dependents.length > b.dependents.length ? -1 : 1;
};
const abort = (error, log) => {
    log.appendLine(`Importing content item failed, aborting. Error: ${error.toString()}`);
};
let dependents = {};
const importContentItem = (item, mapping, client, log, shouldRewrite, existing) => __awaiter(void 0, void 0, void 0, function* () {
    const content = item.owner.content;
    item.dependencies.forEach((dep) => {
        rewriteDependency(dep, mapping, shouldRewrite);
    });
    const originalId = content.id;
    content.id = mapping.getContentItem(content.id) || '';
    if (lodash_1.default.isEmpty(content.id)) {
        delete content.id;
    }
    let newItem;
    let oldVersion;
    try {
        const result = yield createOrUpdateContent(client, item.owner.repo, existing, content);
        newItem = result.newItem;
        oldVersion = result.oldVersion;
    }
    catch (e) {
        log.error(`Failed creating ${content.label}:`, e);
        abort(e, log);
        return false;
    }
    const updated = oldVersion > 0;
    log.addComment(`${updated ? 'Updated' : 'Created'} ${content.label}.`);
    log.addAction(updated ? 'UPDATE' : 'CREATE', (newItem.id || 'unknown') + (updated ? ` ${oldVersion} ${newItem.version}` : ''));
    content.id = originalId;
    dependents[originalId] = newItem;
    mapping.registerContentItem(originalId, newItem.id);
    mapping.registerContentItem(newItem.id, newItem.id);
});
const importTree = (client, tree, mapping, log, argv) => __awaiter(void 0, void 0, void 0, function* () {
    let publishable = [];
    for (let i = 0; i < tree.levels.length; i++) {
        const level = tree.levels[i];
        for (let j = 0; j < level.items.length; j++) {
            const item = level.items[j];
            yield importContentItem(item, mapping, client, log, false, mapping.getContentItem(item.owner.content.id) || null);
        }
    }
    let publishChildren = 0;
    publishable = publishable.filter(entry => {
        let isTopLevel = true;
        tree.traverseDependents(entry.node, (dependent) => {
            if (dependent != entry.node && publishable.findIndex(entry => entry.node === dependent) !== -1) {
                isTopLevel = false;
            }
        }, true);
        if (!isTopLevel) {
            publishChildren++;
        }
        return isTopLevel;
    });
    for (let pass = 0; pass < 2; pass++) {
        const mode = pass === 0 ? 'Creating' : 'Resolving';
        (0, logger_1.logUpdate)(`${mode} circular dependents.`);
        const circularLinksSorted = tree.circularLinks.sort(sortDependencies);
        for (let i = 0; i < circularLinksSorted.length; i++) {
            const item = circularLinksSorted[i];
            yield importContentItem(item, mapping, client, log, pass === 0, dependents[item.owner.content.id] || mapping.getContentItem(item.owner.content.id));
        }
    }
    (0, logger_1.logUpdate)('Done!');
    return true;
});
const handler = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    const { dir, baseRepo, baseFolder, validate, logFile } = argv;
    const force = argv.force || false;
    let { mapFile } = argv;
    argv.publish = argv.publish || argv.republish;
    const client = (0, dynamic_content_client_factory_1.default)(argv);
    const log = logFile.open();
    let hub;
    try {
        hub = yield client.hubs.get(argv.hubId);
    }
    catch (e) {
        log.error(`Couldn't get hub:`, e);
        yield log.close();
        return false;
    }
    let importTitle = 'unknownImport';
    if (baseFolder != null) {
        importTitle = `folder-${baseFolder}`;
    }
    else if (baseRepo != null) {
        importTitle = `repo-${baseRepo}`;
    }
    else {
        importTitle = `hub-${hub.id}`;
    }
    const mapping = new content_mapping_1.ContentMapping();
    if (mapFile == null) {
        mapFile = getDefaultMappingPath(importTitle);
    }
    if (yield mapping.load(mapFile)) {
        (0, logger_1.logUpdate)(`Existing mapping loaded from '${mapFile}', changes will be saved back to it.`);
    }
    else {
        (0, logger_1.logUpdate)(`Creating new mapping file at '${mapFile}'.`);
    }
    let tree;
    if (baseFolder != null) {
        let repo;
        let folder;
        try {
            const bFolder = yield client.folders.get(baseFolder);
            repo = yield bFolder.related.contentRepository();
            folder = bFolder;
        }
        catch (e) {
            log.error(`Couldn't get base folder:`, e);
            yield log.close();
            return false;
        }
        tree = yield prepareContentForImport(client, hub, [{ repo, basePath: dir }], folder, mapping, log, argv);
    }
    else if (baseRepo != null) {
        let repo;
        try {
            repo = yield client.contentRepositories.get(baseRepo);
        }
        catch (e) {
            log.error(`Couldn't get base repository:`, e);
            yield log.close();
            return false;
        }
        tree = yield prepareContentForImport(client, hub, [{ repo, basePath: dir }], null, mapping, log, argv);
    }
    else {
        let repos;
        try {
            repos = yield (0, dc_demostore_integration_1.paginator)(hub.related.contentRepositories.list);
        }
        catch (e) {
            log.error(`Couldn't get repositories:`, e);
            yield log.close();
            return false;
        }
        const baseDirContents = yield (0, util_1.promisify)(fs_1.readdir)(dir);
        const importRepos = [];
        const missingRepos = [];
        for (let i = 0; i < baseDirContents.length; i++) {
            const name = baseDirContents[i];
            const path = (0, path_1.join)(dir, name);
            const status = yield (0, util_1.promisify)(fs_1.lstat)(path);
            if (status.isDirectory()) {
                const match = repos.find(repo => repo.label === name);
                if (match) {
                    importRepos.push({ basePath: path, repo: match });
                }
                else {
                    missingRepos.push(name);
                }
            }
        }
        if (missingRepos.length > 0) {
            log.appendLine("The following repositories must exist on the destination hub to import content into them, but don't:");
            missingRepos.forEach(name => {
                log.appendLine(`  ${name}`);
            });
            if (importRepos.length > 0) {
                const ignore = force ||
                    (yield (0, question_helpers_1.asyncQuestion)('These repositories will be skipped during the import, as they need to be added to the hub manually. Do you want to continue? (y/n) ', log));
                if (!ignore) {
                    yield log.close();
                    return false;
                }
                log.warn(`${missingRepos.length} repositories skipped.`);
            }
        }
        if (importRepos.length == 0) {
            log.error('Could not find any matching repositories to import into, aborting.');
            yield log.close();
            return false;
        }
        tree = yield prepareContentForImport(client, hub, importRepos, null, mapping, log, argv);
    }
    let result = true;
    if (tree != null) {
        if (!validate) {
            result = yield importTree(client, tree, mapping, log, argv);
        }
        else {
            log.appendLine('--validate was passed, so no content was imported.');
        }
    }
    trySaveMapping(mapFile, mapping, log);
    yield log.close();
    return result;
});
exports.handler = handler;
exports.default = exports.handler;
