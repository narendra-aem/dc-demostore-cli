import { Argv } from "yargs";
import { LoggableContext } from "../handlers/resource-handler";

import { loginDC, setupLogging, createTempDir } from "./middleware";
import _ from "lodash";

import { nanoid } from "nanoid";
import { useEnvironment } from "./environment-manager";
import { Dictionary } from "async";
import { setLogDirectory } from "./logger";

export const commandOptions: Dictionary<any> = {
  logRequests: {
    alias: "r",
    describe: "log HTTP requests and responses",
    type: "boolean",
    default: false,
    middleware: setupLogging,
  },
  tempDir: {
    alias: "t",
    describe: "temporary directory for all run files",
    default: `/tmp/demostore/demostore-${nanoid()}`,
    middleware: createTempDir,
  },
  matchingSchema: {
    alias: "m",
    describe: "apply to content items matching schema name",
    type: "array",
  },
};

export default (yargs: Argv): Argv =>
  yargs.options(commandOptions).middleware([
    commandOptions.tempDir.middleware,
    async (c: LoggableContext) => {
      await loginDC(c);

      if (!_.includes(c._, "show")) {
        await useEnvironment(c.environment);

        // caching a map of current content items. this appears to obviate the issue of archived items
        // hanging out on published delivery keys
        await c.amplienceHelper.cacheContentMap();
      }
    },
  ]);
