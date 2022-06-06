import { CleanableResourceHandler, ImportContext } from "./resource-handler"
import { ContentTypeSchema } from "dc-management-sdk-js"
import { getCodecs, paginator, getContentTypeSchema, CommerceAPI, CodecType } from "@amplience/dc-demostore-integration"
import _ from 'lodash'
import chalk from 'chalk'
import { loadJsonFromDirectory } from "../helpers/importer"
import { resolveSchemaBody } from "../helpers/schema-helper"
import fs from 'fs-extra'
import { logUpdate, logComplete, logSubheading } from '../common/logger'
import { ContentTypeHandler } from "./content-type-handler"

let archiveCount = 0
let updateCount = 0
let createCount = 0

const installSchemas = async (context: ImportContext, schemas: ContentTypeSchema[]) => {
    const storedSchemas: ContentTypeSchema[] = await paginator(context.hub.related.contentTypeSchema.list)
    await Promise.all(schemas.map(async schema => {
        let stored = _.find(storedSchemas, s => s.schemaId === schema.schemaId)
        if (stored) {
            if (stored.status === 'ARCHIVED') {
                archiveCount++
                stored = await stored.related.unarchive()
                logUpdate(`${chalk.green('unarch')} schema [ ${chalk.gray(schema.schemaId)} ]`)
            }

            if (schema.body && stored.body !== schema.body) {
                updateCount++
                schema.body = JSON.stringify(JSON.parse(schema.body), undefined, 4)
                stored = await stored.related.update(schema)
                logUpdate(`${chalk.green('update')} schema [ ${chalk.gray(schema.schemaId)} ]`)
            }
        }
        else if (schema.body) {
            createCount++
            schema.body = JSON.stringify(JSON.parse(schema.body), undefined, 4)
            stored = await context.hub.related.contentTypeSchema.create(schema)
            logUpdate(`${chalk.green('create')} schema [ ${chalk.gray(schema.schemaId)} ]`)
        }
    }))
}

export class ContentTypeSchemaHandler extends CleanableResourceHandler {
    sortPriority = 1.09
    icon = '🗄'

    constructor() {
        super(ContentTypeSchema, 'contentTypeSchema')
        archiveCount = 0
        updateCount = 0
        createCount = 0
    }

    async import(context: ImportContext): Promise<any> {
        logSubheading(`[ import ] content-type-schemas`)

        let baseDir = `${context.tempDir}/content`
        let sourceDir = `${baseDir}/content-type-schemas`

        if (!fs.existsSync(sourceDir)) {
            return
        }

        // first we will load the site/integration types (codecs)
        let codecs = getCodecs(CodecType.commerce)
        let codecSchemas = codecs.map(getContentTypeSchema)
        await installSchemas(context, codecSchemas)

        const schemas = loadJsonFromDirectory<ContentTypeSchema>(sourceDir, ContentTypeSchema);
        const [resolvedSchemas, resolveSchemaErrors] = await resolveSchemaBody(schemas, sourceDir);
        const schemasToInstall = _.filter(Object.values(resolvedSchemas), s => !_.includes(_.map(codecs, 'schema.uri'), s.schemaId))

        if (Object.keys(resolveSchemaErrors).length > 0) {
            const errors = Object.entries(resolveSchemaErrors)
                .map(value => {
                    const [filename, error] = value;
                    return `* ${filename} -> ${error}`;
                })
                .join('\n');
            throw new Error(`Unable to resolve the body for the following files:\n${errors}`);
        }

        let demostoreConfigSchema = _.find(schemasToInstall, s => s.schemaId === 'https://demostore.amplience.com/site/demostoreconfig')
        if (demostoreConfigSchema?.body) {
            let schemaBody = JSON.parse(demostoreConfigSchema.body)
            schemaBody.properties.commerce.allOf = [{
                "$ref": "http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference"
            }, {
                properties: {
                    contentType: {
                        enum: codecs.map(c => c.schema.uri)
                    }
                }
            }]
            demostoreConfigSchema.body = JSON.stringify(schemaBody)
        }

        await installSchemas(context, schemasToInstall)
        logComplete(`${this.getDescription()}: [ ${chalk.green(archiveCount)} unarchived ] [ ${chalk.green(updateCount)} updated ] [ ${chalk.green(createCount)} created ]`)
 
        await new ContentTypeHandler().import(context) 
    }
}