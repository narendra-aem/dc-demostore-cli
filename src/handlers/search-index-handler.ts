import { CleanupContext, ImportContext, ResourceHandler } from "./resource-handler";
import logger, { logComplete, logSubheading, logUpdate } from "../common/logger"
import algoliasearch from "algoliasearch";
import { existsSync } from "fs";
import { readJsonSync } from "fs-extra";
import chalk from 'chalk'
import { prompts } from "../common/prompts"

export class SearchIndexHandler extends ResourceHandler {
    icon = '🔎';

    constructor() {
        super(undefined, 'searchIndexes')
    }

    async import(context: ImportContext): Promise<any> {
        logSubheading(`[ import ] search indexes`)
        const { algolia } = context.environment;
        if (!algolia?.appId || !algolia.writeKey) {
            logger.info(`skipped, algolia environment not configured`);
            return;
        }

        const client = algoliasearch(algolia.appId, algolia.writeKey);

        const indexesFile = `${context.tempDir}/content/indexes/indexes.json`;
        if (!existsSync(indexesFile)) {
            logger.info(`skipped, content/indexes/indexes.json not found`);
            return;
        }

        const indexFixtures = readJsonSync(indexesFile);

        for (const {indexDetails, settings} of indexFixtures) {
            try {
                logUpdate(`apply index settings: ${chalk.cyanBright(indexDetails.name)}`);
                const index = client.initIndex(indexDetails.name);
                index.setSettings(settings);
            } catch (error) {
                logger.error(`${prompts.error} applying index settings [ ${indexDetails.name} ]: ${error.message}`);
            }
        }

        logComplete(`${this.getDescription()}: [ ${chalk.green(indexFixtures.length)} updated ]`);

        context.config.algolia = {
            appId: context.environment.algolia?.appId || '',
            apiKey: context.environment.algolia?.searchKey || ''
        }
    }

    async cleanup(context: CleanupContext) {
        logSubheading(`[ cleanup ] search indexes`)
        const { algolia } = context.environment;
        if (!algolia?.appId || !algolia.writeKey) {
            logger.info(`skipped, algolia environment not configured`);
            return;
        }

        const client = algoliasearch(algolia.appId, algolia.writeKey);

        const indexesFile = `${context.tempDir}/content/indexes/indexes.json`;
        if (!existsSync(indexesFile)) {
            logger.info(`skipped, content/indexes/indexes.json not found`);
            return;
        }

        const indexFixtures = readJsonSync(indexesFile);

        for (const {indexDetails} of indexFixtures) {
            try {
                logUpdate(`deleting index objects: ${chalk.cyanBright(indexDetails.name)}`);
                const index = client.initIndex(indexDetails.name);
                await index.clearObjects();
            } catch (error) {
                logger.error(`${prompts.error} deleting index objects [ ${indexDetails.name} ]: ${error.message}`);
            }
        }

        logComplete(`${this.getDescription()}: [ ${chalk.red(indexFixtures.length)} cleared ]`);
    }
}