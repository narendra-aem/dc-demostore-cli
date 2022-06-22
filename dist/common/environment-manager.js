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
exports.listEnvironments = exports.createEnvironment = exports.currentEnvironment = exports.useEnvironment = exports.useEnvironmentFromArgs = exports.chooseEnvironment = exports.selectEnvironment = exports.getEnvironment = exports.byName = exports.getEnvironments = exports.deleteEnvironment = exports.addEnvironment = exports.updateEnvironments = exports.CONFIG_PATH = exports.getConfigPath = void 0;
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const lodash_1 = __importDefault(require("lodash"));
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = __importDefault(require("child_process"));
const { Select, AutoComplete } = require('enquirer');
const logger_1 = __importDefault(require("../common/logger"));
const fs_extra_2 = __importDefault(require("fs-extra"));
const getConfigPath = (platform = process.platform) => (0, path_1.join)(process.env[platform == 'win32' ? 'USERPROFILE' : 'HOME'] || __dirname, '.amplience');
exports.getConfigPath = getConfigPath;
exports.CONFIG_PATH = (0, exports.getConfigPath)();
const ENV_FILE_PATH = `${exports.CONFIG_PATH}/environments.json`;
fs_extra_2.default.mkdirpSync(exports.CONFIG_PATH);
const saveConfig = () => (0, fs_extra_1.writeFileSync)(ENV_FILE_PATH, JSON.stringify(envConfig, undefined, 4), { encoding: 'utf-8' });
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
    (0, exports.useEnvironment)(env);
};
exports.addEnvironment = addEnvironment;
const deleteEnvironment = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    let env = yield (0, exports.selectEnvironment)(argv);
    lodash_1.default.remove(envConfig.envs, (e) => e.name === env.name);
    saveConfig();
});
exports.deleteEnvironment = deleteEnvironment;
const getEnvironments = () => envConfig.envs.map(env => (Object.assign(Object.assign({}, env), { active: envConfig.current === env.name })));
exports.getEnvironments = getEnvironments;
const byName = (lookup) => (obj) => obj.name === lookup;
exports.byName = byName;
const getEnvironment = (name) => envConfig.envs.find((0, exports.byName)(name));
exports.getEnvironment = getEnvironment;
const selectEnvironment = (argv) => __awaiter(void 0, void 0, void 0, function* () { return argv.env ? (0, exports.getEnvironment)(argv.env) : yield (0, exports.chooseEnvironment)(); });
exports.selectEnvironment = selectEnvironment;
const chooseEnvironment = (handler) => __awaiter(void 0, void 0, void 0, function* () {
    const envs = (0, exports.getEnvironments)();
    const active = envs.find(env => env.active);
    const name = yield (new AutoComplete({
        name: 'env',
        message: `choose an environment ${chalk_1.default.bold.green(`[ current: ${active === null || active === void 0 ? void 0 : active.name} ]`)}`,
        limit: envs.length,
        multiple: false,
        choices: lodash_1.default.map(envs, 'name')
    })).run();
    let env = envs.find((0, exports.byName)(name));
    return handler ? yield handler(env) : env;
});
exports.chooseEnvironment = chooseEnvironment;
const useEnvironmentFromArgs = (argv) => __awaiter(void 0, void 0, void 0, function* () {
    let env = yield (0, exports.selectEnvironment)(argv);
    yield (0, exports.useEnvironment)(env);
});
exports.useEnvironmentFromArgs = useEnvironmentFromArgs;
const useEnvironment = (env) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.default.info(`[ ${chalk_1.default.greenBright(env.name)} ] configure dc-cli...`);
    child_process_1.default.execSync(`npx -y @amplience/dc-cli configure --clientId ${env.dc.clientId} --clientSecret ${env.dc.clientSecret} --hubId ${env.dc.hubId}`);
    logger_1.default.info(`[ ${chalk_1.default.greenBright(env.name)} ] environment active`);
    envConfig.current = env.name;
    saveConfig();
});
exports.useEnvironment = useEnvironment;
const currentEnvironment = () => __awaiter(void 0, void 0, void 0, function* () {
    if (envConfig.envs.length === 0) {
        logger_1.default.info(`no demostore configs found, let's create one!`);
        logger_1.default.info('');
        yield (0, exports.createEnvironment)();
    }
    let env = (0, exports.getEnvironment)(envConfig.current);
    if (!env) {
        env = yield (0, exports.chooseEnvironment)();
        (0, exports.useEnvironment)(env);
    }
    return env;
});
exports.currentEnvironment = currentEnvironment;
const { Input, Password } = require('enquirer');
const ask = (message) => __awaiter(void 0, void 0, void 0, function* () { return yield (new Input({ message }).run()); });
const secureAsk = (message) => __awaiter(void 0, void 0, void 0, function* () { return yield (new Password({ message }).run()); });
const helpTag = (message) => chalk_1.default.gray(`(${message})`);
const sectionHeader = (message) => console.log(`\n${message}\n`);
const appTag = chalk_1.default.bold.cyanBright('app');
const dcTag = chalk_1.default.bold.cyanBright('dynamic content');
const damTag = chalk_1.default.bold.cyanBright('content hub');
const credentialsHelpText = helpTag('credentials assigned by Amplience support');
const hubIdHelpText = helpTag('found in hub settings -> properties');
const deploymentHelpText = helpTag('-> https://n.amprsa.net/deployment-instructions');
const createEnvironment = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let environments = (0, exports.getEnvironments)();
        let name = yield ask(`name this config:`);
        if (environments.find((0, exports.byName)(name))) {
            throw new Error(`config already exists: ${name}`);
        }
        sectionHeader(`${appTag} configuration ${deploymentHelpText}`);
        let url = yield ask(`deployment url:`);
        sectionHeader(`${dcTag} configuration ${credentialsHelpText}`);
        let clientId = yield ask(`client ${chalk_1.default.magenta('id')}:`);
        let clientSecret = yield secureAsk(`client ${chalk_1.default.magenta('secret')}:`);
        let hubId = yield ask(`hub id ${hubIdHelpText}:`);
        sectionHeader(`${damTag} configuration ${credentialsHelpText}`);
        let username = yield ask(`username:`);
        let password = yield secureAsk(`password:`);
        (0, exports.addEnvironment)({
            name,
            url,
            dc: {
                clientId,
                clientSecret,
                hubId
            },
            dam: {
                username,
                password
            }
        });
    }
    catch (error) {
        console.log(chalk_1.default.red(error));
    }
});
exports.createEnvironment = createEnvironment;
const listEnvironments = () => {
    (0, exports.getEnvironments)().forEach(env => {
        let str = `  ${env.name}`;
        if (env.active) {
            str = chalk_1.default.greenBright(`* ${env.name}`);
        }
        console.log(str);
    });
};
exports.listEnvironments = listEnvironments;
(0, fs_extra_1.mkdirpSync)(exports.CONFIG_PATH);
let envConfig = (0, fs_extra_1.existsSync)(ENV_FILE_PATH) ? (0, fs_extra_1.readJsonSync)(ENV_FILE_PATH) : { envs: [], current: null };
(0, exports.updateEnvironments)();
