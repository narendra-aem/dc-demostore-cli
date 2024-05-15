import logger, { logRunEnd, setLogDirectory } from "./logger";
import {
  AxiosHttpClient,
  HttpRequest,
  HttpResponse,
} from "dc-management-sdk-js";
import amplienceHelper from "./amplience-helper";
import _ from "lodash";

import fs from "fs-extra";
import chalk from "chalk";
import { prompts } from "./prompts";
import { LoggableContext } from "../handlers/resource-handler";
import { StatusCodes } from "http-status-codes";

export const loginDC = async (context: LoggableContext): Promise<any> => {
  context.amplienceHelper = amplienceHelper(context);
  context.hub = await context.amplienceHelper.login();
};

export const createTempDir = (context: LoggableContext) => {
  fs.rmSync(context.tempDir, { recursive: true, force: true });
  fs.mkdirpSync(context.tempDir);
  logger.info(`${prompts.created} temp dir: ${chalk.blue(context.tempDir)}`);
  setLogDirectory(context.tempDir);
};

export const setupLogging = (context: LoggableContext) => {
  // monkey patch the AxiosHttpClient that dc-management-sdk-js uses to capture requests and responses
  let _request = AxiosHttpClient.prototype.request;
  AxiosHttpClient.prototype.request = async function (
    request: HttpRequest,
  ): Promise<HttpResponse> {
    try {
      let start = new Date();
      let startString = start.valueOf();
      let requestId = `${startString}-${request.method}-${request.url.split("/").pop()?.split("?")?.[0]}`;
      let response: HttpResponse = await _request.call(this, request);
      let duration = new Date().valueOf() - start.valueOf();

      // let's log this request and response
      logger.debug(
        `[ ${startString} ] ${request.method} | ${request.url} | ${response.status} | ${StatusCodes[response.status]} | ${duration}ms`,
      );

      if (context.logRequests) {
        let subDir = response.status > 400 ? `error` : `success`;
        let requestLogDir = `${context.tempDir}/requests/${subDir}/${requestId}`;
        fs.mkdirpSync(requestLogDir);
        fs.writeJSONSync(`${requestLogDir}/request.json`, request);
        fs.writeJSONSync(`${requestLogDir}/response.json`, response);
      }
      return response;
    } catch (error) {
      logger.info(error);
      throw error;
    }
  };
};

export const contextHandler =
  (handler: any) => async (context: LoggableContext) => {
    try {
      await handler(context);
    } catch (error) {
      // // novadev-142
      // if (!_.isEmpty(error)) {
      console.log(error);
      logger.error(chalk.bold.red(error.message || error));
      _.each(error.response?.data?.errors, (error) =>
        logger.error(`\t* ${chalk.bold.red(error.code)}: ${error.message}`),
      );
      if (error.stack) {
        logger.error(error.stack);
      }
      // }
    } finally {
      logRunEnd(context);
    }
  };
