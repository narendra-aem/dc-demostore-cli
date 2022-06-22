"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.readConfigFile = exports.configureCommandOptions = exports.builder = exports.CONFIG_FILENAME = exports.desc = exports.command = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
const lodash_1 = require("lodash");
exports.command = 'configure';
exports.desc = 'Saves the configuration options to a file';
const CONFIG_FILENAME = (platform = process.platform) => (0, path_1.join)(process.env[platform == 'win32' ? 'USERPROFILE' : 'HOME'] || __dirname, '.amplience', 'dc-cli-config.json');
exports.CONFIG_FILENAME = CONFIG_FILENAME;
const builder = (yargs) => {
    yargs
        .option('dstHubId', {
        type: 'string',
        describe: 'Destination hub ID. If not specified, it will be the same as the source.'
    })
        .option('dstClientId', {
        type: 'string',
        describe: "Destination account's client ID. If not specified, it will be the same as the source."
    })
        .option('dstSecret', {
        type: 'string',
        describe: "Destination account's secret. Must be used alongside dstClientId."
    });
};
exports.builder = builder;
exports.configureCommandOptions = {
    clientId: { type: 'string', demandOption: true },
    clientSecret: { type: 'string', demandOption: true },
    hubId: { type: 'string', demandOption: true },
    config: { type: 'string', default: (0, exports.CONFIG_FILENAME)() }
};
const writeConfigFile = (configFile, parameters) => {
    const dir = (0, path_1.dirname)(configFile);
    if (!fs_1.default.existsSync(dir)) {
        try {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        catch (err) {
            throw new Error(`Unable to create dir "${dir}". Reason: ${err}`);
        }
    }
    try {
        fs_1.default.writeFileSync(configFile, JSON.stringify(parameters));
    }
    catch (err) {
        throw new Error(`Unable to write config file "${configFile}". Reason: ${err}`);
    }
};
const readConfigFile = (configFile, ignoreError) => {
    if (fs_1.default.existsSync(configFile)) {
        try {
            return JSON.parse(fs_1.default.readFileSync(configFile, 'utf-8'));
        }
        catch (e) {
            if (ignoreError) {
                console.error(`The configuration file at ${configFile} is invalid, its contents will be ignored.\n${e.message}`);
            }
            else {
                console.error(`FATAL - Could not parse JSON configuration. Inspect the configuration file at ${configFile}\n${e.message}`);
                process.exit(2);
            }
        }
    }
    return {};
};
exports.readConfigFile = readConfigFile;
const handler = (argv) => {
    const { clientId, clientSecret, hubId } = argv;
    const storedConfig = (0, exports.readConfigFile)(argv.config);
    const newConfig = { clientId, clientSecret, hubId };
    if (argv.dstClientId)
        newConfig.dstClientId = argv.dstClientId;
    if (argv.dstSecret)
        newConfig.dstSecret = argv.dstSecret;
    if (argv.dstHubId)
        newConfig.dstHubId = argv.dstHubId;
    if ((0, lodash_1.isEqual)(storedConfig, newConfig)) {
        console.log('Config file up-to-date.  Please use `--help` for command usage.');
        return;
    }
    writeConfigFile(argv.config, newConfig);
    console.log('Config file updated.');
};
exports.handler = handler;
