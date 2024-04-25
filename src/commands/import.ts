import _ from 'lodash'
import { Argv } from 'yargs';
import chalk from 'chalk'
import logger, { logHeadline } from '../common/logger';

import { ContentTypeSchemaHandler } from '../handlers/content-type-schema-handler';
import { ContentItemHandler } from '../handlers/content-item-handler';
import { ExtensionHandler } from '../handlers/extension-handler';
import { WebhookHandler } from '../handlers/webhook-handler';
import { SettingsHandler } from '../handlers/settings-handler';

import { Importable, ImportContext } from '../handlers/resource-handler';
import { contextHandler } from '../common/middleware';
import amplienceBuilder from '../common/amplience-builder';
import { SearchIndexHandler } from '../handlers/search-index-handler';
import { AUTOMATION_DIR_PATH, processAutomationTemplateFiles, setupAutomationTemplateFiles } from '../helpers/automation-helper';

export const command = 'import';
export const desc = "Import hub data";

export const builder = (yargs: Argv): Argv => {
    return amplienceBuilder(yargs).options({
        automationDir: {
            alias: 'a',
            describe: 'path to automation directory',
            default: AUTOMATION_DIR_PATH
        },
        skipContentImport: {
            alias: 's',
            describe: 'skip content import',
            type: 'boolean'
        },
        latest: {
            alias: 'l',
            describe: 'use latest automation files',
            type: 'boolean'
        },
        openaiKey: {
            alias: 'o',
            describe: 'OpenAI Key (required for rich text AI features)',
            type: 'string',
            default: ''
        }
    }).middleware([
        async (context: ImportContext) => {
            // making sure context config is populated before starting
            if(!context.config) {
                context.config = await context.amplienceHelper.getDemoStoreConfig();
            }
            await setupAutomationTemplateFiles(context);
        }
    ])
    .command("extensions", "Import extensions", {}, importHandler(new ExtensionHandler()))
    .command("webhooks", "Import webhooks", {}, importHandler(new WebhookHandler()))
    .command("settings", "Import settings", {}, importHandler(new SettingsHandler()))
    .command("types", "Import content types/schemas", {}, importHandler(new ContentTypeSchemaHandler()))
    .command("search-indexes", "Import search indexes", {}, importHandler(new SearchIndexHandler()))
}

const importHandler = (handler: Importable) => async (context: ImportContext): Promise<void> => {
    await processAutomationTemplateFiles(context)
    await handler.import(context)
}

export const handler = contextHandler(async (context: ImportContext): Promise<void> => {
    logger.info(`${chalk.green(command)}: ${desc} started at ${chalk.magentaBright(context.startTime)}`)

    logHeadline(`Phase 1: preparation`)

    await processAutomationTemplateFiles(context)

    await new ContentTypeSchemaHandler().import(context)

    logHeadline(`Phase 2: import/update`)

    // process settings
    await importHandler(new SettingsHandler())(context)

    // process extensions
    await importHandler(new ExtensionHandler())(context)

    // process webhooks
    await importHandler(new WebhookHandler())(context)

    // process algolia indexes
    await importHandler(new SearchIndexHandler())(context)

    if (!context.skipContentImport) {
        logHeadline(`Phase 3: content import`)

        // process content items
        await importHandler(new ContentItemHandler())(context)

        logHeadline(`Phase 4: reentrant import`)

        // reimport content types that have been updated
        // now that we've installed the core content, we need to go through again for content types
        // that point to a specific hierarchy node
        await importHandler(new ContentTypeSchemaHandler())(context)
    }

    // generate .env.local file
    logHeadline(`Phase 5: generate demostore configuration`)
    await context.amplienceHelper.generateDemoStoreConfig()
})