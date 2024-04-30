import { join } from "path";
import { readJsonSync, existsSync, mkdirpSync, writeFileSync } from "fs-extra";
import _ from "lodash";
import chalk from "chalk";
import { Arguments } from "yargs";
import childProcess from "child_process";
const { AutoComplete } = require("enquirer");
import logger from "../common/logger";
import fs from "fs-extra";

export const getConfigPath = (platform: string = process.platform): string =>
  join(
    process.env[platform == "win32" ? "USERPROFILE" : "HOME"] || __dirname,
    ".amplience",
  );
export const CONFIG_PATH = getConfigPath();
const ENV_FILE_PATH = `${CONFIG_PATH}/environments.json`;

fs.mkdirpSync(CONFIG_PATH);
const saveConfig = () =>
  writeFileSync(ENV_FILE_PATH, JSON.stringify(envConfig, undefined, 4), {
    encoding: "utf-8",
  });

export const updateEnvironments = () => {
  _.each(envConfig.envs, (env) => {
    // envName to name
    if (env.envName) {
      env.name = env.envName;
      delete env.envName;
    }

    // appUrl to url
    if (env.appUrl) {
      env.url = env.appUrl;
      delete env.appUrl;
    }

    // fix urls with trailing slashes
    env.url = env.url.replace(/\/$/, "");
  });
  delete envConfig.appUrl;
  saveConfig();
};

export const addEnvironment = (env: any) => {
  envConfig.envs.push(env);
  useEnvironment(env);
};

export const deleteEnvironment = async (argv: Arguments) => {
  let env = await selectEnvironment(argv);
  _.remove(envConfig.envs, (e: any) => e.name === env.name);
  saveConfig();
};

export const getEnvironments = () =>
  envConfig.envs.map((env) => ({
    ...env,
    active: envConfig.current === env.name,
  }));

type Named = { name: string };
export const byName = (lookup: string) => (obj: Named) => obj.name === lookup;
export const getEnvironment = (name: string) =>
  envConfig.envs.find(byName(name));
export const selectEnvironment = async (argv: Arguments) =>
  argv.env ? getEnvironment(argv.env as string) : await chooseEnvironment();

export const chooseEnvironment = async (handler?: any) => {
  const envs = getEnvironments();
  const active = envs.find((env) => env.active);
  const name = await new AutoComplete({
    name: "env",
    message: `choose an environment ${chalk.bold.green(`[ current: ${active?.name} ]`)}`,
    limit: envs.length,
    multiple: false,
    choices: _.map(envs, "name"),
  }).run();

  let env = envs.find(byName(name));
  return handler ? await handler(env) : env;
};

export const useEnvironmentFromArgs = async (argv: any) => {
  let env = await selectEnvironment(argv);
  await useEnvironment(env);
};

export const useEnvironment = async (env: any) => {
  logger.info(`[ ${chalk.greenBright(env.name)} ] configure dc-cli...`);
  childProcess.execSync(
    `npx -y @amplience/dc-cli configure --clientId ${env.dc.clientId} --clientSecret ${env.dc.clientSecret} --hubId ${env.dc.hubId}`,
  );
  logger.info(`[ ${chalk.greenBright(env.name)} ] environment active`);
  envConfig.current = env.name;
  saveConfig();
};

export const currentEnvironment = async () => {
  if (envConfig.envs.length === 0) {
    logger.info(`no demostore configs found, let's create one!`);
    logger.info("");
    await createEnvironment();
  }

  let env = getEnvironment(envConfig.current);
  if (!env) {
    env = await chooseEnvironment();
    useEnvironment(env);
  }
  return env;
};

const { Input, Password, Confirm } = require("enquirer");

// formatting helpers
const prompt = async (message: string) => await new Confirm({ message }).run();
const ask = async (message: string) => await new Input({ message }).run();
const secureAsk = async (message: string) =>
  await new Password({ message }).run();
const helpTag = (message: string) => chalk.gray(`(${message})`);
const sectionHeader = (message: string) => console.log(`\n${message}\n`);

const appTag = chalk.bold.cyanBright("app");
const dcTag = chalk.bold.cyanBright("dynamic content");
const damTag = chalk.bold.cyanBright("content hub");
const algoliaTag = chalk.bold.cyanBright("algolia");
const credentialsHelpText = helpTag(
  "credentials assigned by Amplience support",
);
const hubIdHelpText = helpTag("found in hub settings -> properties");
const deploymentHelpText = helpTag(
  "-> https://n.amprsa.net/deployment-instructions",
);

export const createEnvironment = async () => {
  try {
    // get loaded environments
    const environments = getEnvironments();
    const name = await ask(`name this config:`);

    if (environments.find(byName(name))) {
      throw new Error(`config already exists: ${name}`);
    }

    // app config
    sectionHeader(`${appTag} configuration ${deploymentHelpText}`);

    const url = await ask(`deployment url:`);

    // dc config
    sectionHeader(`${dcTag} configuration ${credentialsHelpText}`);

    const clientId = await ask(`client ${chalk.magenta("id")}:`);
    const clientSecret = await secureAsk(`client ${chalk.magenta("secret")}:`);
    const hubId = await ask(`hub id ${hubIdHelpText}:`);

    // dam config
    sectionHeader(`${damTag} configuration ${credentialsHelpText}`);

    const username = await ask(`username:`);
    const password = await secureAsk(`password:`);

    // algolia config
    let algolia;
    const configureAlgolia = await prompt(
      `Would you like to configure Algolia?`,
    );
    if (configureAlgolia) {
      sectionHeader(`${algoliaTag} configuration ${credentialsHelpText}`);

      const appId = await ask(`Application ID:`);
      const searchKey = await ask(`Search API Key:`);
      const writeKey = await ask(`Write API Key:`);

      algolia = {
        appId,
        searchKey,
        writeKey,
      };
    }

    addEnvironment({
      name,
      url,
      dc: {
        clientId,
        clientSecret,
        hubId,
      },
      dam: {
        username,
        password,
      },
      algolia,
    });
  } catch (error) {
    console.log(chalk.red(error));
  }
};

export const listEnvironments = () => {
  getEnvironments().forEach((env) => {
    let str = `  ${env.name}`;
    if (env.active) {
      str = chalk.greenBright(`* ${env.name}`);
    }
    console.log(str);
  });
};

// make sure config directory exists
mkdirpSync(CONFIG_PATH);
let envConfig = existsSync(ENV_FILE_PATH)
  ? readJsonSync(ENV_FILE_PATH)
  : { envs: [], current: null };
updateEnvironments();
