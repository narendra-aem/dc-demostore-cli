import {
  ResourceHandler,
  Cleanable,
  ImportContext,
  CleanupContext,
} from "./resource-handler";
import { ContentItem, ContentRepository, Folder } from "dc-management-sdk-js";
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
import pThrottle from "p-throttle";

const ACTIVE_PROPS = ["filterActive", "active"];

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
    const publishingThrottle = pThrottle({
      limit: 1,
      interval: 600,
    });
    const throttledUnpublish = publishingThrottle(
      context.amplienceHelper.unpublishContentItem,
    );
    const repositories = await paginator(
      context.hub.related.contentRepositories.list,
    );
    const contentTypes = await paginator(context.hub.related.contentTypes.list);

    let unpublishCount = 0;
    let archiveCount = 0;
    let folderCount = 0;

    for (const repository of repositories) {
      logUpdate(
        `${prompts.cleanup} repository ${chalk.cyanBright(repository.name)}...`,
      );
      let contentItems: ContentItem[] = _.filter(
        await paginator(repository.related.contentItems.list, {
          status: "ACTIVE",
        }),
        (ci) => this.shouldCleanUpItem(ci, context),
      );
      logUpdate(
        `Found ${contentItems?.length} content items in repository ${chalk.cyanBright(repository.name)} to clean`,
      );
      await Promise.all(
        contentItems.map(async (contentItem: ContentItem) => {
          logUpdate(
            `cleaning content item: ${contentItem.id} (repository: ${repository.name})`,
          );
          let needsUpdate = false;
          // Unpublish content item if published
          if (_.has(contentItem, "_links.unpublish.href")) {
            logUpdate(
              `unpublishing content item: ${contentItem.id} (repository: ${repository.name})`,
            );
            await throttledUnpublish(contentItem);
            await context.amplienceHelper.waitUntilUnpublished(contentItem);
            unpublishCount++;
          }

          let contentType = _.find(
            contentTypes,
            (ct) => ct.contentTypeUri === contentItem.body._meta.schema,
          );

          if (
            contentType &&
            _.has(contentType, "_links.effective-content-type.href")
          ) {
            logUpdate(
              `settings active props for content item: ${contentItem.id} (repository: ${repository.name})`,
            );
            let effectiveContentType: any =
              await context.amplienceHelper.getEffectiveContentType(
                contentType,
              );
            let activePropsType = ACTIVE_PROPS.filter(
              (prop) =>
                effectiveContentType?.properties[prop]?.type === "boolean",
            );

            // Updating active flags
            if (activePropsType.length > 0) {
              for (const prop of activePropsType) {
                contentItem.body[prop] = false;
                needsUpdate = true;
              }
            }
          }

          // Modify deliveryKey to be unique if present
          if (!_.isEmpty(contentItem.body._meta.deliveryKey)) {
            logUpdate(
              `modifying delivery key for content item: ${contentItem.id} (repository: ${repository.name})`,
            );
            contentItem.body._meta.deliveryKey = `${contentItem.body._meta.deliveryKey.slice(0, 128)}-${nanoid()}`;
            needsUpdate = true;
          }

          if (needsUpdate) {
            logUpdate(
              `updating content item: ${contentItem.id} (repository: ${repository.name})`,
            );
            contentItem = await contentItem.related.update(contentItem);
            await sleep(1000);
          }

          // Archive content item
          logUpdate(
            `archiving content item: ${contentItem.id} (repository: ${repository.name})`,
          );
          await contentItem.related.archive();
          archiveCount++;
          _.remove(
            context.automation?.contentItems,
            (ci) => contentItem.id === ci.to,
          );
        }),
      );

      const cleanupFolder = async (folder: Folder) => {
        let subfolders = await paginator(folder.related.folders.list);
        await Promise.all(subfolders.map(cleanupFolder));
        logUpdate(
          `${prompts.delete} folder ${folder.name} (repository: ${repository.name})`,
        );
        folderCount++;
        return await context.amplienceHelper.deleteFolder(folder);
      };

      // clean up folders
      let folders = await paginator(repository.related.folders.list);
      logUpdate(
        `Cleaning up folders in repository ${chalk.cyanBright(repository.name)}...`,
      );
      await Promise.all(folders.map(cleanupFolder));
      logUpdate(
        `${prompts.cleanup} repository ${chalk.cyanBright(repository.name)} complete`,
      );
    }

    logComplete(
      `${this.getDescription()}: [ ${chalk.yellow(unpublishCount)} items unpublished ] [ ${chalk.yellow(archiveCount)} items archived ] [ ${chalk.red(folderCount)} folders deleted ]`,
    );
  }
}
