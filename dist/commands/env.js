"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.builder = exports.envBuilder = exports.description = exports.command = void 0;
const environment_manager_1 = require("../common/environment-manager");
exports.command = 'env';
exports.description = 'Manage demostore environments';
const envBuilder = (yargs) => yargs.positional('env', {
    describe: 'env name',
    type: 'string',
    demandOption: false
});
exports.envBuilder = envBuilder;
const builder = (yargs) => yargs
    .demandCommand()
    .command("add", "Add an demostore environment", environment_manager_1.createEnvironment)
    .command("delete [env]", "Delete an demostore environment", exports.envBuilder, environment_manager_1.deleteEnvironment)
    .command("list", "List demostore environments", environment_manager_1.listEnvironments)
    .command("use [env]", "Use demostore environment", exports.envBuilder, environment_manager_1.useEnvironmentFromArgs)
    .help();
exports.builder = builder;
