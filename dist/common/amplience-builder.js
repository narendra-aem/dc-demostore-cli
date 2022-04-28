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
const middleware_1 = require("./middleware");
const lodash_1 = __importDefault(require("lodash"));
const nanoid_1 = require("nanoid");
const amplience_helper_1 = require("./amplience-helper");
const environment_manager_1 = require("./environment-manager");
exports.default = (yargs) => yargs
    .options({
    logRequests: {
        alias: 'r',
        describe: 'log HTTP requests and responses',
        type: 'boolean',
        default: false
    },
    tempDir: {
        alias: 't',
        describe: 'temporary directory for all run files',
        default: `/tmp/demostore/demostore-${(0, nanoid_1.nanoid)()}`
    },
    matchingSchema: {
        alias: 'm',
        describe: 'apply to content items matching schema name',
        type: 'array'
    }
})
    .middleware([
    middleware_1.setupLogging,
    (c) => __awaiter(void 0, void 0, void 0, function* () { return yield (0, middleware_1.loginDC)(c); }),
    (context) => __awaiter(void 0, void 0, void 0, function* () {
        if (!lodash_1.default.includes(context._, 'show')) {
            yield (0, environment_manager_1.useEnvironment)(context.environment);
            yield (0, amplience_helper_1.cacheContentMap)(context);
        }
    }),
]);
