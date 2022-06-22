"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.ExtensionHandler = void 0;
const resource_handler_1 = require("./resource-handler");
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = __importStar(require("../common/logger"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const prompts_1 = require("../common/prompts");
const nanoid_1 = require("nanoid");
const nanoid_dictionary_1 = require("nanoid-dictionary");
const nanoid = (0, nanoid_1.customAlphabet)(nanoid_dictionary_1.lowercase, 50);
class ExtensionHandler extends resource_handler_1.ResourceHandler {
    constructor() {
        super(dc_management_sdk_js_1.Extension, 'extensions');
        this.icon = '🔌';
        this.sortPriority = 1.1;
    }
    import(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { hub } = context;
            (0, logger_1.logSubheading)(`[ import ] extensions`);
            let extensionsFile = `${context.tempDir}/content/extensions/extensions.json`;
            if (!fs_extra_1.default.existsSync(extensionsFile)) {
                logger_1.default.info(`skipped, content/extensions/extensions.json not found`);
                return;
            }
            let extensions = fs_extra_1.default.readJsonSync(extensionsFile);
            const existingExtensions = yield (0, dc_demostore_integration_1.paginator)(hub.related.extensions.list);
            let createCount = 0;
            yield Promise.all(extensions.map((ext) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!lodash_1.default.includes(lodash_1.default.map(existingExtensions, 'name'), ext.name)) {
                        (0, logger_1.logUpdate)(`${prompts_1.prompts.import} extension [ ${ext.name} ]`);
                        let extension = yield hub.related.extensions.create(ext);
                        createCount++;
                    }
                }
                catch (error) {
                    if (error.message.indexOf('EXTENSION_NAME_DUPLICATE')) {
                        logger_1.default.error(`${prompts_1.prompts.error} importing extension [ ${ext.name} ]: duplicate name`);
                    }
                    else {
                        logger_1.default.error(`${prompts_1.prompts.error} importing extension [ ${ext.name} ]: ${error.message}`);
                    }
                }
            })));
            (0, logger_1.logComplete)(`${this.getDescription()}: [ ${chalk_1.default.green(createCount)} created ]`);
        });
    }
    cleanup(context) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, logger_1.logSubheading)(`[ cleanup ] extensions`);
            try {
                let deleteCount = 0;
                let extensions = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.extensions.list);
                yield Promise.all(extensions.map((ext) => __awaiter(this, void 0, void 0, function* () {
                    let oldName = ext.name;
                    ext.name = nanoid();
                    ext = yield ext.related.update(ext);
                    deleteCount++;
                    yield ext.related.delete();
                    (0, logger_1.logUpdate)(`${chalk_1.default.red('delete')} extension [ ${oldName} ]`);
                })));
                (0, logger_1.logComplete)(`${this.getDescription()}: [ ${chalk_1.default.red(deleteCount)} deleted ]`);
            }
            catch (error) {
                logger_1.default.error(error.message || error);
            }
        });
    }
}
exports.ExtensionHandler = ExtensionHandler;
