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
exports.commandOptions = void 0;
const middleware_1 = require("./middleware");
const lodash_1 = __importDefault(require("lodash"));
const nanoid_1 = require("nanoid");
const environment_manager_1 = require("./environment-manager");
exports.commandOptions = {
    logRequests: {
        alias: 'r',
        describe: 'log HTTP requests and responses',
        type: 'boolean',
        default: false,
        middleware: middleware_1.setupLogging
    },
    tempDir: {
        alias: 't',
        describe: 'temporary directory for all run files',
        default: `/tmp/demostore/demostore-${(0, nanoid_1.nanoid)()}`,
        middleware: middleware_1.createTempDir
    },
    matchingSchema: {
        alias: 'm',
        describe: 'apply to content items matching schema name',
        type: 'array'
    }
};
exports.default = (yargs) => yargs
    .options(exports.commandOptions)
    .middleware([
    exports.commandOptions.tempDir.middleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, middleware_1.loginDC)(c);
        if (!lodash_1.default.includes(c._, 'show')) {
            yield (0, environment_manager_1.useEnvironment)(c.environment);
            yield c.amplienceHelper.cacheContentMap();
        }
    })
]);
