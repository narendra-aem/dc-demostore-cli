import { CleanableResourceHandler } from "./resource-handler";
import { Webhook } from "dc-management-sdk-js";
import { ImportContext, CleanupContext } from "./resource-handler";
import { paginator } from "../common/dccli/paginator";
import _ from "lodash";
import logger, {
  logComplete,
  logSubheading,
  logUpdate,
} from "../common/logger";
import chalk from "chalk";
import fs from "fs-extra";
import { prompts } from "../common/prompts";

export class WebhookHandler extends CleanableResourceHandler {
  sortPriority = 0.01;
  icon = "🪝";

  constructor() {
    super(Webhook, "webhooks");
  }

  async import(context: ImportContext): Promise<any> {
    const { hub } = context;
    logSubheading(`[ import ] webhooks`);

    let webhooksionsFile = `${context.tempDir}/content/webhooks/webhooks.json`;
    if (!fs.existsSync(webhooksionsFile)) {
      logger.info(`skipped, content/webhooks/webhooks.json not found`);
      return;
    }

    let webhooks = fs.readJsonSync(webhooksionsFile);

    const existingWebhooks = await paginator(hub.related.webhooks.list);
    let createCount = 0;

    await Promise.all(
      webhooks.map(async (wh: Webhook) => {
        try {
          if (!_.includes(_.map(existingWebhooks, "label"), wh.label)) {
            logUpdate(`${prompts.import} webhook [ ${wh.label} ]`);
            await hub.related.webhooks.create(wh);
            createCount++;
          }
        } catch (error) {
          logger.error(
            `${prompts.error} importing webhook [ ${wh.label} ]: ${error.message}`,
          );
        }
      }),
    );

    logComplete(
      `${this.getDescription()}: [ ${chalk.green(createCount)} created ]`,
    );
  }

  async cleanup(context: CleanupContext): Promise<any> {
    logSubheading(`[ cleanup ] webhooks`);
    try {
      let deleteCount = 0;
      let webhooks: Webhook[] = await paginator(
        context.hub.related.webhooks.list,
      );
      await Promise.all(
        webhooks.map(async (wh) => {
          deleteCount++;
          await wh.related.delete();
          logUpdate(`${chalk.red("delete")} webhook [ ${wh.label} ]`);
        }),
      );
      logComplete(
        `${this.getDescription()}: [ ${chalk.red(deleteCount)} deleted ]`,
      );
    } catch (error) {
      logger.error(error.message || error);
    }
  }
}
