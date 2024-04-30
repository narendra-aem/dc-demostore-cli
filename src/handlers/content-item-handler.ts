import {
  ResourceHandler,
  Cleanable,
  ImportContext,
  CleanupContext,
} from "./resource-handler";
import {
  ContentItem,
  ContentRepository,
  ContentType,
  Folder,
} from "dc-management-sdk-js";
import { paginator } from "../common/dccli/paginator";
import chalk from "chalk";
import { prompts } from "../common/prompts";
import fs from "fs-extra";
import logger, { logUpdate, logComplete } from "../common/logger";
import _ from "lodash";
import { fileIterator, sleep } from "../common/utils";
import { nanoid } from "nanoid";
import DCCLIContentItemHandler from "./dc-cli-content-item-handler";
import { createLog } from "../common/dccli/log-helpers";
import { getMapping } from "../common/types";

/**
 * Root level properties to set as false when archiving a content item.
 */
const activeProps = ["filterActive", "active"];

export class ContentItemHandler extends ResourceHandler implements Cleanable {
  sortPriority = 0.03;
  icon = "📄";

  constructor() {
    super(ContentItem, "contentItems");
  }

  async import(context: ImportContext) {
    const automation = await (
      await context.amplienceHelper.getAutomation()
    ).body;
    fs.writeJsonSync(`${context.tempDir}/mapping.json`, {
      contentItems: _.map(automation.contentItems, (ci) => [ci.from, ci.to]),
      workflowStates: _.map(automation.workflowStates, (ws) => [
        ws.from,
        ws.to,
      ]),
    });
    context.automation = automation;

    // copy so we can compare later after we do an import
    fs.copyFileSync(
      `${context.tempDir}/mapping.json`,
      `${context.tempDir}/old_mapping.json`,
    );
    logger.info(`wrote mapping file at ${context.tempDir}/mapping.json`);

    let sourceDir = `${context.tempDir}/content/content-items`;
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`source dir not found: ${sourceDir}`);
    }

    await fileIterator(sourceDir, await getMapping(context)).iterate(
      async (file) => {
        let mapping = _.find(
          context.automation?.contentItems,
          (map) => map.from === file.object.id,
        );
        if (mapping) {
          let contentItem = await context.amplienceHelper.getContentItem(
            mapping.to,
          );
          if (_.isEqual(contentItem.body, file.object.body)) {
            fs.unlinkSync(file.path);
          }
        }
      },
    );

    let importLogFile = `${context.tempDir}/item-import.log`;
    await DCCLIContentItemHandler({
      dir: sourceDir,
      logFile: createLog(importLogFile),
      clientId: context.environment.dc.clientId,
      clientSecret: context.environment.dc.clientSecret,
      hubId: context.environment.dc.hubId,
      mapFile: `${context.tempDir}/mapping.json`,
    });

    // read the log file
    let logFile = fs.readFileSync(importLogFile, { encoding: "utf-8" });
    let createdCount = _.filter(logFile.split("\n"), (l) =>
      l.startsWith("CREATE "),
    ).length;
    let updatedCount = _.filter(logFile.split("\n"), (l) =>
      l.startsWith("UPDATE "),
    ).length;

    logComplete(
      `${this.getDescription()}: [ ${chalk.green(createdCount)} created ] [ ${chalk.blue(updatedCount)} updated ]`,
    );
    await context.amplienceHelper.publishAll();

    // recache
    await context.amplienceHelper.cacheContentMap();

    // update the automation content item with any new mapping content generated
    await context.amplienceHelper.updateAutomation();
  }

  shouldCleanUpItem(item: ContentItem, context: CleanupContext): boolean {
    return (
      _.includes(context.matchingSchema, item.body._meta.schema) ||
      _.isEmpty(context.matchingSchema)
    );
  }

  async cleanup(context: CleanupContext): Promise<any> {
    let repositories = await paginator(
      context.hub.related.contentRepositories.list,
    );
    let contentTypes = await paginator(context.hub.related.contentTypes.list);

    let archiveCount = 0;
    let folderCount = 0;

    // First pass, update active flags and delivery keys
    await Promise.all(
      repositories.map(async (repository: ContentRepository) => {
        logUpdate(
          `${prompts.archive} content items in repository ${chalk.cyanBright(repository.name)}...`,
        );
        let contentItems: ContentItem[] = _.filter(
          await paginator(repository.related.contentItems.list, {
            status: "ACTIVE",
          }),
          (ci) => this.shouldCleanUpItem(ci, context),
        );

        await Promise.all(
          contentItems.map(async (contentItem: ContentItem) => {
            let needsUpdate = false;
            let contentType = _.find(
              contentTypes,
              (ct) => ct.contentTypeUri === contentItem.body._meta.schema,
            );

            // get the effective content type
            let effectiveContentTypeLink = _.get(
              contentType,
              "_links.effective-content-type.href",
            );
            if (!effectiveContentTypeLink) {
              return;
            }
            let effectiveContentType: any = await context.amplienceHelper.get(
              effectiveContentTypeLink,
            );
            let activePropsType = activeProps.filter(
              (prop) =>
                effectiveContentType?.properties &&
                effectiveContentType.properties[prop]?.type === "boolean",
            );

            // Updating active flags
            if (activePropsType.length > 0) {
              for (const prop of activePropsType) {
                contentItem.body[prop] = false;
                needsUpdate = true;
              }
            }

            // Updating delivery key
            if (contentItem.body._meta.deliveryKey?.length > 0) {
              if (!_.isEmpty(contentItem.body._meta.deliveryKey)) {
                contentItem.body._meta.deliveryKey = `${contentItem.body._meta.deliveryKey}-${nanoid()}`;
                needsUpdate = true;
              }
            }

            if (needsUpdate) {
              logUpdate(`updating content item active flag / delivery key`);
              contentItem = await contentItem.related.update(contentItem);
              await sleep(1000);
              logUpdate(`publishing updates`);
              await context.amplienceHelper.publishContentItem(contentItem);
              await sleep(1000);
            }
          }),
        );
      }),
    );

    // Second pass, archive content and remove folders
    await Promise.all(
      repositories.map(async (repository: ContentRepository) => {
        logUpdate(
          `${prompts.archive} content items in repository ${chalk.cyanBright(repository.name)}...`,
        );
        let contentItems: ContentItem[] = _.filter(
          await paginator(repository.related.contentItems.list, {
            status: "ACTIVE",
          }),
          (ci) => this.shouldCleanUpItem(ci, context),
        );

        await Promise.all(
          contentItems.map(async (contentItem: ContentItem) => {
            let contentType = _.find(
              contentTypes,
              (ct) => ct.contentTypeUri === contentItem.body._meta.schema,
            );

            // get the effective content type
            let effectiveContentTypeLink = _.get(
              contentType,
              "_links.effective-content-type.href",
            );
            if (!effectiveContentTypeLink) {
              return;
            }
            archiveCount++;
            await contentItem.related.archive();
            _.remove(
              context.automation?.contentItems,
              (ci) => contentItem.id === ci.to,
            );
          }),
        );

        const cleanupFolder = async (folder: Folder) => {
          let subfolders = await paginator(folder.related.folders.list);
          await Promise.all(subfolders.map(cleanupFolder));
          logUpdate(`${prompts.delete} folder ${folder.name}`);
          folderCount++;
          return await context.amplienceHelper.deleteFolder(folder);
        };

        // also clean up folders
        let folders = await paginator(repository.related.folders.list);
        await Promise.all(folders.map(cleanupFolder));
      }),
    );

    logComplete(
      `${this.getDescription()}: [ ${chalk.yellow(archiveCount)} items archived ] [ ${chalk.red(folderCount)} folders deleted ]`,
    );
  }
}
