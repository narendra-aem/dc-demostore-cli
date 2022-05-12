import fs from 'fs-extra'
import { ImportContext } from '../handlers/resource-handler';
import { fileIterator } from '../common/utils';
import { getMapping, Mapping } from '../common/types';

export const copyTemplateFilesToTempDir = async (context: ImportContext) => {
    let contentFolder = `${context.tempDir}/content`
    let folder = `${context.automationDir}/content`

    // Create repositories folder
    fs.mkdirpSync(contentFolder)

    // Copy ./content folder in repositories
    fs.copySync(folder, contentFolder)

    let mapping = await getMapping(context)
    fs.writeFileSync(`${context.tempDir}/content_mapping.json`, JSON.stringify(mapping, undefined, 4))

    await fileIterator(contentFolder, mapping).iterate(async () => {
    })
}
