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
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const lodash_1 = __importDefault(require("lodash"));
const handlers_1 = require("../handlers");
const chalk_1 = __importDefault(require("chalk"));
const async_1 = __importDefault(require("async"));
const middleware_1 = require("../common/middleware");
const amplience_builder_1 = __importDefault(require("../common/amplience-builder"));
const typed_result_1 = require("../handlers/typed-result");
const { Confirm, MultiSelect } = require('enquirer');
exports.command = 'cleanup';
exports.desc = "Clean up hub";
const builder = (yargs) => (0, amplience_builder_1.default)(yargs)
    .options({
    include: {
        alias: 'i',
        describe: 'types to include',
        type: 'array'
    },
    skipConfirmation: {
        alias: 'c',
        describe: 'skip confirmation prompt',
        type: 'boolean'
    },
    all: {
        alias: 'a',
        describe: 'clean up all resource types',
        type: 'boolean'
    },
    content: {
        describe: 'cleans up contentTypes, contentTypeSchema, contentItems with no confirmation',
        type: 'boolean'
    }
}).middleware([(args) => __awaiter(void 0, void 0, void 0, function* () {
        if (!!args.content) {
            args.skipConfirmation = true;
            args.include = ['contentTypes', 'contentTypeSchema', 'contentItems'];
        }
    })]);
exports.builder = builder;
exports.handler = (0, middleware_1.contextHandler)((context) => __awaiter(void 0, void 0, void 0, function* () {
    let choices = [];
    if (context.all) {
        choices = handlers_1.Cleanables;
    }
    else if (context.include) {
        choices = lodash_1.default.compact(lodash_1.default.map(context.include, inc => lodash_1.default.find(handlers_1.Cleanables, handler => handler.resourceTypeDescription === inc)));
    }
    else {
        choices = yield new MultiSelect({
            message: 'select categories to clean',
            choices: lodash_1.default.map(handlers_1.Cleanables, (h) => ({ name: h.getDescription(), value: h })),
            result(names) { return this.map(names); }
        }).run();
    }
    choices = lodash_1.default.sortBy(choices, 'sortPriority');
    if (!context.skipConfirmation) {
        console.log(`${chalk_1.default.redBright('warning:')} this will perform the following actions on hub [ ${chalk_1.default.cyanBright(context.hub.name)} ]`);
        lodash_1.default.each(choices, (choice) => { console.log(`\t* ${choice.getLongDescription()}`); });
    }
    if (context.skipConfirmation || (yield new Confirm({ message: `${chalk_1.default.bold(chalk_1.default.greenBright('proceed?'))}` }).run())) {
        yield async_1.default.eachSeries(choices, (choice, callback) => __awaiter(void 0, void 0, void 0, function* () {
            (0, typed_result_1.timed)(`[ cleanup ] ${choice.resourceTypeDescription}`, () => __awaiter(void 0, void 0, void 0, function* () {
                yield choice.cleanup(context);
                callback();
            }));
        }));
    }
}));
