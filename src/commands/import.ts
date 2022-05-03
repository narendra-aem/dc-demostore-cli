import _ from 'lodash'
import { Argv } from 'yargs';
import chalk from 'chalk'
import logger, { logHeadline } from '../common/logger';

import { ContentTypeSchemaHandler } from '../handlers/content-type-schema-handler';
import { ContentTypeHandler } from '../handlers/content-type-handler';
import { timed } from "../handlers/typed-result";
import { ContentItemHandler } from '../handlers/content-item-handler';
import { ExtensionHandler } from '../handlers/extension-handler';
import { SearchIndexHandler } from '../handlers/search-index-handler';
import { SettingsHandler } from '../handlers/settings-handler';

import { AmplienceHelper } from '../common/amplience-helper';
import { ImportContext } from '../handlers/resource-handler';
import { copyTemplateFilesToTempDir } from '../helpers/import-helper';
import { contextHandler } from '../common/middleware';
import amplienceBuilder from '../common/amplience-builder';
import { WorkflowState } from 'dc-management-sdk-js';
import fs from 'fs-extra'
import { CONFIG_PATH } from '../common/environment-manager';
import axios from 'axios';
import admZip from 'adm-zip'
import { sleep } from '../common/utils';
import { paginator } from '@amplience/dc-demostore-integration';
import { Mapping } from '../common/types';

export const command = 'import';
export const desc = "Import hub data";

const automationDirPath = `${CONFIG_PATH}/dc-demostore-automation`

const downloadZip = async (branch: string): Promise<void> => {
    let url = `https://github.com/amplience/dc-demostore-automation/archive/refs/heads/${branch}.zip`

    logger.info(`downloading latest automation files to ${chalk.blue(automationDirPath)}...`)
    logger.info(`\t${chalk.green(url)}`)

    const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream'
    })

    const zipFilePath = `${CONFIG_PATH}/${branch}.zip`

    // pipe the result stream into a file on disc
    response.data.pipe(fs.createWriteStream(zipFilePath))

    // return a promise and resolve when download finishes
    return new Promise((resolve, reject) => {
        response.data.on('end', async () => {
            logger.info(`download successful, unzipping...`)
            await sleep(1000)

            let zip = new admZip(zipFilePath)
            zip.extractAllTo(CONFIG_PATH)

            // move files from the dc-demostore-automation-${branch} folder to the automationDirPath
            fs.moveSync(`${CONFIG_PATH}/dc-demostore-automation-${branch}`, automationDirPath)

            // delete the zip
            fs.rmSync(zipFilePath)

            resolve()
        })

        response.data.on('error', () => {
            reject()
        })
    })
}

export const builder = (yargs: Argv): Argv => {
    return amplienceBuilder(yargs).options({
        automationDir: {
            alias: 'a',
            describe: 'path to automation directory',
            default: automationDirPath
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
        branch: {
            alias: 'b',
            describe: 'branch of dc-demostore-automation to use',
            type: 'string',
            default: 'main'
        }
    }).middleware([
        async (context: ImportContext) => {
            // delete the cached automation files if --latest was used
            if (context.latest) {
                await fs.rm(automationDirPath, { recursive: true, force: true })
            }

            // set up the automation dir if it does not exist and download the latest automation files
            if (!fs.existsSync(automationDirPath)) {
                await downloadZip(context.branch)
            }
        }
    ])
}

export const handler = contextHandler(async (context: ImportContext): Promise<void> => {
    logger.info(`${chalk.green(command)}: ${desc} started at ${chalk.magentaBright(context.startTime)}`)

    logHeadline(`Phase 1: preparation`)

    await copyTemplateFilesToTempDir(context)
    await new ContentTypeSchemaHandler().import(context)
    await new ContentTypeHandler().import(context)

    // this call must be after the schema and type import because it's creating objects if they don't exist
    context.config = await (await context.amplienceHelper.getDemoStoreConfig()).body

    logHeadline(`Phase 2: import/update`)

    await copyTemplateFilesToTempDir(context)

    // process step 1: npm run automate:settings
    await new SettingsHandler().import(context)

    // process step 4: npm run automate:extensions
    await new ExtensionHandler().import(context)

    // process step 5: npm run automate:indexes
    await new SearchIndexHandler().import(context)

    if (!context.skipContentImport) {
        // process step 6: npm run automate:content-with-republish
        await new ContentItemHandler().import(context)

        logHeadline(`Phase 3: update automation`)

        // update the automation content item with any new mapping content generated
        await context.amplienceHelper.updateAutomation()

        logHeadline(`Phase 4: reentrant import`)

        // recopy template files with new mappings
        await copyTemplateFilesToTempDir(context)

        // reimport content types that have been updated
        // now that we've installed the core content, we need to go through again for content types
        // that point to a specific hierarchy node
        await new ContentTypeSchemaHandler().import(context)
        await new ContentTypeHandler().import(context)
    }
})