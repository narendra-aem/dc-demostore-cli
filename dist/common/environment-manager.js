"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEnvironments = exports.createEnvironment = exports.currentEnvironment = exports.useEnvironment = exports.useEnvironmentFromArgs = exports.chooseEnvironment = exports.selectEnvironment = exports.getEnvironment = exports.getEnvironments = exports.deleteEnvironment = exports.addEnvironment = exports.updateEnvironments = exports.CONFIG_PATH = exports.getConfigPath = void 0;
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const lodash_1 = __importDefault(require("lodash"));
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = __importDefault(require("child_process"));
const { Select } = require('enquirer');
const logger_1 = __importDefault(require("../common/logger"));
const fs_extra_2 = __importDefault(require("fs-extra"));
const getConfigPath = (platform = process.platform) => path_1.join(process.env[platform == 'win32' ? 'USERPROFILE' : 'HOME'] || __dirname, '.amplience');
exports.getConfigPath = getConfigPath;
exports.CONFIG_PATH = exports.getConfigPath();
const ENV_FILE_PATH = `${exports.CONFIG_PATH}/environments.json`;
fs_extra_2.default.mkdirpSync(exports.CONFIG_PATH);
const saveConfig = () => fs_extra_1.writeFileSync(ENV_FILE_PATH, JSON.stringify(envConfig, undefined, 4), { encoding: 'utf-8' });
const updateEnvironments = () => {
    lodash_1.default.each(envConfig.envs, env => {
        if (env.envName) {
            env.name = env.envName;
            delete env.envName;
        }
        if (env.appUrl) {
            env.url = env.appUrl;
            delete env.appUrl;
        }
        env.url = env.url.replace(/\/$/, '');
    });
    delete envConfig.appUrl;
    saveConfig();
};
exports.updateEnvironments = updateEnvironments;
const addEnvironment = (env) => {
    envConfig.envs.push(env);
    exports.useEnvironment(env);
};
exports.addEnvironment = addEnvironment;
const deleteEnvironment = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    let env = yield exports.selectEnvironment(argv);
    lodash_1.default.remove(envConfig.envs, (e) => e.name === env.name);
    saveConfig();
});
exports.deleteEnvironment = deleteEnvironment;
const getEnvironments = () => lodash_1.default.map(envConfig.envs, env => (Object.assign(Object.assign({}, env), { active: envConfig.current === env.name })));
exports.getEnvironments = getEnvironments;
const getEnvironment = (name) => lodash_1.default.find(envConfig.envs, env => name === env.name);
exports.getEnvironment = getEnvironment;
const selectEnvironment = (argv) => __awaiter(void 0, void 0, void 0, function* () { return argv.env ? exports.getEnvironment(argv.env) : yield exports.chooseEnvironment(); });
exports.selectEnvironment = selectEnvironment;
const chooseEnvironment = (handler) => __awaiter(void 0, void 0, void 0, function* () {
    const envs = exports.getEnvironments();
    const name = yield (new Select({
        name: 'env',
        message: 'choose an environment',
        choices: lodash_1.default.map(envs, 'name')
    })).run();
    let env = lodash_1.default.find(envs, e => e.name === name);
    if (handler) {
        yield handler(env);
    }
    else {
        return env;
    }
});
exports.chooseEnvironment = chooseEnvironment;
const useEnvironmentFromArgs = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    let env = yield exports.selectEnvironment(argv);
    yield exports.useEnvironment(env);
});
exports.useEnvironmentFromArgs = useEnvironmentFromArgs;
const useEnvironment = (env) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.default.info(`[ ${chalk_1.default.greenBright(env.name)} ] configure dc-cli...`);
    child_process_1.default.execSync(`npx @amplience/dc-cli configure --clientId ${env.dc.clientId} --clientSecret ${env.dc.clientSecret} --hubId ${env.dc.hubId}`);
    logger_1.default.info(`[ ${chalk_1.default.greenBright(env.name)} ] environment active`);
    envConfig.current = env.name;
    saveConfig();
});
exports.useEnvironment = useEnvironment;
const currentEnvironment = () => __awaiter(void 0, void 0, void 0, function* () {
    if (envConfig.envs.length === 0) {
        logger_1.default.info(`no demostore environments found, let's create one!`);
        logger_1.default.info('');
        yield exports.createEnvironment();
    }
    let env = exports.getEnvironment(envConfig.current);
    if (!env) {
        env = yield exports.chooseEnvironment();
        exports.useEnvironment(env);
    }
    return env;
});
exports.currentEnvironment = currentEnvironment;
const { Input, Password } = require('enquirer');
const createEnvironment = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let environments = exports.getEnvironments();
        let name = yield (new Input({ message: 'env name:' }).run());
        if (lodash_1.default.find(environments, env => name === env.name)) {
            throw new Error(`environment already exists: ${name}`);
        }
        exports.addEnvironment({
            name,
            url: yield (new Input({ message: `${chalk_1.default.blueBright('app')} deployment url:` }).run()),
            dc: {
                clientId: yield (new Input({ message: `${chalk_1.default.cyanBright('cms')} client id:` }).run()),
                clientSecret: yield (new Password({ message: `${chalk_1.default.cyanBright('cms')} client secret:` }).run()),
                hubId: yield (new Input({ message: `${chalk_1.default.cyanBright('cms')} hub id:` }).run())
            },
            dam: {
                username: yield (new Input({ message: `${chalk_1.default.magentaBright('dam')} username:` }).run()),
                password: yield (new Password({ message: `${chalk_1.default.magentaBright('dam')} password:` }).run())
            }
        });
    }
    catch (error) {
        console.log(chalk_1.default.red(error));
    }
});
exports.createEnvironment = createEnvironment;
const listEnvironments = () => {
    lodash_1.default.each(exports.getEnvironments(), env => {
        let str = `  ${env.name}`;
        if (env.active) {
            str = chalk_1.default.greenBright(`* ${env.name}`);
        }
        console.log(str);
    });
};
exports.listEnvironments = listEnvironments;
fs_extra_1.mkdirpSync(exports.CONFIG_PATH);
let envConfig = fs_extra_1.existsSync(ENV_FILE_PATH) ? fs_extra_1.readJsonSync(ENV_FILE_PATH) : { envs: [], current: null };
exports.updateEnvironments();
