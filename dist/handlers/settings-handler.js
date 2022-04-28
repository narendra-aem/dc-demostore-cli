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
exports.SettingsHandler = void 0;
const resource_handler_1 = require("./resource-handler");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const exec_helper_1 = require("../helpers/exec-helper");
const logger_1 = __importStar(require("../common/logger"));
const chalk_1 = __importDefault(require("chalk"));
class SettingsHandler extends resource_handler_1.ResourceHandler {
    constructor() {
        super(undefined, 'settings');
        this.icon = '🛠';
    }
    import(context) {
        return __awaiter(this, void 0, void 0, function* () {
            let { hub } = context;
            (0, logger_1.logSubheading)(`[ import ] settings`);
            let settingsJSONFile = `${context.tempDir}/content/settings/settings.json`;
            if (!fs_extra_1.default.existsSync(settingsJSONFile)) {
                logger_1.default.info(`skipped, no settings.json found`);
                return;
            }
            let hubWorkflowStates = yield (0, dc_demostore_integration_1.paginator)(hub.related.workflowStates.list);
            let { settings, workflowStates } = fs_extra_1.default.readJsonSync(settingsJSONFile);
            settings = lodash_1.default.isEqualWith(lodash_1.default.pick(hub.settings, Object.keys(settings)), settings, (a, b) => {
                return Array.isArray(a) && Array.isArray(b) ? lodash_1.default.isEqual(lodash_1.default.sortBy(a), lodash_1.default.sortBy(b)) : undefined;
            }) ? {} : settings;
            workflowStates = lodash_1.default.reject(workflowStates, fws => lodash_1.default.includes(lodash_1.default.map(lodash_1.default.uniqBy(hubWorkflowStates, 'label'), 'label'), fws.label));
            if (!lodash_1.default.isEmpty(settings) || !lodash_1.default.isEmpty(workflowStates)) {
                fs_extra_1.default.writeJsonSync(settingsJSONFile, { settings, workflowStates });
                yield new exec_helper_1.CLIJob(`npx @amplience/dc-cli@latest settings import ${settingsJSONFile}`).exec();
            }
            else {
                logger_1.default.info(`settings are ${chalk_1.default.green('up-to-date')}`);
            }
        });
    }
}
exports.SettingsHandler = SettingsHandler;
