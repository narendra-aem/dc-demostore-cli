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
const yargs_1 = __importDefault(require("yargs/yargs"));
const yargs_command_builder_options_1 = __importDefault(require("./common/yargs/yargs-command-builder-options"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importDefault(require("./common/logger"));
const environment_manager_1 = require("./common/environment-manager");
const configureYargs = (yargInstance) => {
    return new Promise((resolve) => __awaiter(void 0, void 0, void 0, function* () {
        let failInvoked = false;
        const isYError = (err) => err instanceof Error && err.name === 'YError';
        const failFn = (msg, err) => {
            if (failInvoked) {
                return;
            }
            failInvoked = true;
            if ((msg && !err) || isYError(err)) {
                yargInstance.showHelp('error');
            }
            else if (err) {
                logger_1.default.error(chalk_1.default.red(err));
                process.exit(0);
            }
        };
        const argv = yargInstance
            .scriptName('demostore')
            .usage('Usage: $0 <command> [options]')
            .commandDir('./commands', yargs_command_builder_options_1.default)
            .strict()
            .demandCommand(1, 'Please specify at least one command')
            .exitProcess(false)
            .showHelpOnFail(false)
            .middleware([(context) => __awaiter(void 0, void 0, void 0, function* () {
                context.startTime = new Date();
                logger_1.default.info(`run [ ${chalk_1.default.green(context._)} ]: started at ${context.startTime}`);
                context.environment = yield (0, environment_manager_1.currentEnvironment)();
            })])
            .fail(failFn).argv;
        resolve(argv);
    }));
};
exports.default = (yargInstance = (0, yargs_1.default)(process.argv.slice(2))) => __awaiter(void 0, void 0, void 0, function* () {
    return yield configureYargs(yargInstance);
});
