import _ from 'lodash';
import chalk from 'chalk';
import logger from '../common/logger';
import fs from 'fs-extra';
import { CONFIG_PATH } from '../common/environment-manager';
import axios from 'axios';
import admZip from 'adm-zip'
import { fileIterator, sleep } from '../common/utils';
import { CleanupContext, ImportContext } from '../handlers/resource-handler';
import { getMapping } from '../common/types';

export const AUTOMATION_DIR_PATH = `${CONFIG_PATH}/dc-demostore-automation`;

export const fetchRemoteTemplateFiles = async (): Promise<void> => {
    let url = `https://github.com/amplience/dc-demostore-automation/archive/refs/heads/main.zip`;

    logger.info(`downloading latest automation files to ${chalk.blue(AUTOMATION_DIR_PATH)}...`);
    logger.info(`\t${chalk.green(url)}`);

    const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream'
    });

    const zipFilePath = `${CONFIG_PATH}/main.zip`;

    // pipe the result stream into a file on disc
    response.data.pipe(fs.createWriteStream(zipFilePath));

    // return a promise and resolve when download finishes
    return new Promise((resolve, reject) => {
        response.data.on('end', async () => {
            logger.info(`download successful, unzipping...`);
            await sleep(1000);

            let zip = new admZip(zipFilePath);
            zip.extractAllTo(CONFIG_PATH);

            // move files from the dc-demostore-automation-main folder to the automationDirPath
            fs.moveSync(`${CONFIG_PATH}/dc-demostore-automation-main`, AUTOMATION_DIR_PATH);

            // delete the zip
            fs.rmSync(zipFilePath);

            resolve();
        })
        response.data.on('error', reject);
    });
}

export const setupAutomationTemplateFiles = async (context: ImportContext | CleanupContext) => {
    // delete the cached automation files if --latest was used
    if (context.latest) {
        await fs.rm(AUTOMATION_DIR_PATH, { recursive: true, force: true });
    }

    // set up the automation dir if it does not exist and download the latest automation files
    if (!fs.existsSync(AUTOMATION_DIR_PATH)) {
        await fetchRemoteTemplateFiles();
    }
}

export const processAutomationTemplateFiles = async (context: ImportContext | CleanupContext) => {
    const contentTempDir = `${context.tempDir}/content`;
    const contentAutomationDir = `${context.automationDir}/content`;

    // Create content temp dir
    fs.mkdirpSync(contentTempDir);

    // Copy content from automation dir to temp dir
    fs.copySync(contentAutomationDir, contentTempDir);

    const mapping = await getMapping(context);
    fs.writeFileSync(`${context.tempDir}/content_mapping.json`, JSON.stringify(mapping, undefined, 4));

    await fileIterator(contentTempDir, mapping).iterate(async () => {});
}