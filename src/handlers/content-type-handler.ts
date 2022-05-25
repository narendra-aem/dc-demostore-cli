import { CleanableResourceHandler, CleanupContext, ImportContext } from "./resource-handler"
import { ContentType, ContentRepository } from "dc-management-sdk-js"
import { CodecType, getCodecs, getContentType, getContentTypeSchema, paginator } from "@amplience/dc-demostore-integration"
import _ from 'lodash'
import logger, { logSubheading } from "../common/logger"
import chalk from 'chalk'
import { loadJsonFromDirectory } from "../helpers/importer"
import { ContentTypeWithRepositoryAssignments } from '../helpers/schema-helper'
import fs from 'fs-extra'
import { logUpdate, logComplete } from '../common/logger'
import { prompts } from '../common/prompts'

export const validateNoDuplicateContentTypeUris = (importedContentTypes: { [filename: string]: ContentType }): void | never => {
    const uriToFilenameMap = new Map<string, string[]>(); // map: uri x filenames
    for (const [filename, contentType] of Object.entries(importedContentTypes)) {
        if (contentType.contentTypeUri) {
            const otherFilenames: string[] = uriToFilenameMap.get(contentType.contentTypeUri) || [];
            if (filename) {
                uriToFilenameMap.set(contentType.contentTypeUri, [...otherFilenames, filename]);
            }
        }
    }
    const uniqueDuplicateUris: [string, string[]][] = [];
    uriToFilenameMap.forEach((filenames, uri) => {
        if (filenames.length > 1) {
            uniqueDuplicateUris.push([uri, filenames]);
        }
    });

    if (uniqueDuplicateUris.length > 0) {
        throw new Error(
            `Content Types must have unique uri values. Duplicate values found:-\n${uniqueDuplicateUris
                .map(([uri, filenames]) => `  uri: '${uri}' in files: [${filenames.map(f => `'${f}'`).join(', ')}]`)
                .join('\n')}`
        );
    }
};

let synchronizedCount = 0
let archiveCount = 0
let updateCount = 0
let createCount = 0
let assignedCount = 0

const installTypes = async (context: ImportContext, types: ContentTypeWithRepositoryAssignments[]) => {
    const activeContentTypes: ContentType[] = await paginator(context.hub.related.contentTypes.list, { status: 'ACTIVE' });
    const archivedContentTypes: ContentType[] = await paginator(context.hub.related.contentTypes.list, { status: 'ARCHIVED' });
    const storedContentTypes = [...activeContentTypes, ...archivedContentTypes];

    // let fileContentTypes = _.map(Object.entries(jsonTypes), x => x[1])
    await Promise.all(types.map(async fileContentType => {
        let stored = _.find(storedContentTypes, ct => ct.contentTypeUri === fileContentType.contentTypeUri) as ContentTypeWithRepositoryAssignments
        if (stored) {
            if (stored.status === 'ARCHIVED') {
                stored = await stored.related.unarchive()
                archiveCount++
                logUpdate(`${prompts.unarchive} content type [ ${chalk.gray(fileContentType.contentTypeUri)} ]`)
            }

            stored.settings = fileContentType.settings
            stored = await stored.related.update(stored)
            updateCount++
            logUpdate(`${prompts.update} content type [ ${chalk.gray(fileContentType.contentTypeUri)} ]`)
        }
        else {
            stored = await context.hub.related.contentTypes.register(fileContentType) as ContentTypeWithRepositoryAssignments
            createCount++
            logUpdate(`${prompts.create} content type [ ${chalk.gray(fileContentType.contentTypeUri)} ]`)
        }
    }))

    let repos: ContentRepository[] = await paginator(context.hub.related.contentRepositories.list)
    let activeTypes: ContentType[] = await paginator(context.hub.related.contentTypes.list, { status: 'ACTIVE' });

    await Promise.all(repos.map(async repo => {
        await Promise.all(types.map(async fileContentType => {
            fileContentType.repositories = fileContentType.repositories || ['sitestructure']
            let activeType = _.find(activeTypes, type => type.contentTypeUri === fileContentType.contentTypeUri)
            if (activeType && _.includes(fileContentType.repositories, repo.name)) {
                assignedCount++
                logUpdate(`${prompts.assign} content type [ ${chalk.grey(fileContentType.contentTypeUri)} ]`)
                await repo.related.contentTypes.assign(activeType.id!)
            }
        }))
    }))

    // sync the content type
    await Promise.all(_.filter(activeTypes, t => _.includes(_.map(types, 'contentTypeUri'), t.contentTypeUri)).map(async type => {
        synchronizedCount++
        await type.related.contentTypeSchema.update()
        logUpdate(`${prompts.sync} content type [ ${chalk.gray(type.contentTypeUri)} ]`)
    }))
}

export class ContentTypeHandler extends CleanableResourceHandler {
    sortPriority = 1.1
    icon = '🗂'

    constructor() {
        super(ContentType, 'contentTypes')
        synchronizedCount = 0
        archiveCount = 0
        updateCount = 0
        createCount = 0
        assignedCount = 0
    }

    async import(context: ImportContext): Promise<any> {
        logSubheading(`[ import ] content-types`)

        let sourceDir = `${context.tempDir}/content/content-types`
        if (!fs.existsSync(sourceDir)) {
            return
        }

        // first we will load the site/integration types (codecs)
        await installTypes(context, getCodecs(CodecType.commerce).map(getContentType))

        const jsonTypes = loadJsonFromDirectory<ContentTypeWithRepositoryAssignments>(sourceDir, ContentTypeWithRepositoryAssignments);

        if (Object.keys(jsonTypes).length === 0) {
            throw new Error(`No content types found in ${sourceDir}`);
        }
        validateNoDuplicateContentTypeUris(jsonTypes);

        await installTypes(context, _.filter(Object.values(jsonTypes), s => !_.includes(_.map(getCodecs(CodecType.commerce), 'schema.uri'), s.contentTypeUri)))
        logComplete(`${this.getDescription()}: [ ${chalk.green(archiveCount)} unarchived ] [ ${chalk.green(updateCount)} updated ] [ ${chalk.green(createCount)} created ] [ ${chalk.green(synchronizedCount)} synced ]`)
    }

    async cleanup(context: CleanupContext): Promise<any> {
        logSubheading(`[ cleanup ] content-types`)
        let repos: ContentRepository[] = await paginator(context.hub.related.contentRepositories.list)

        let unassignedCount = 0
        await Promise.all(repos.map(async repo => {
            // unassign all current content types
            let repoTypes = repo.contentTypes
            if (repoTypes) {
                await Promise.all(repoTypes.map(async type => {
                    unassignedCount++
                    logUpdate(`${prompts.unassign} content type [ ${chalk.grey(type.contentTypeUri)} ]`)
                    await repo.related.contentTypes.unassign(type.hubContentTypeId!)
                }))
            }
        }))

        logComplete(`${chalk.cyan(`📦  repositories`)}: [ ${chalk.red(unassignedCount)} content types unassigned ]`)

        // now clean up the content types
        await super.cleanup(context)
    }
}