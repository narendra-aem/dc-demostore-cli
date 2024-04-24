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
exports.WebhookHandler = void 0;
const resource_handler_1 = require("./resource-handler");
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const paginator_1 = require("../common/dccli/paginator");
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = __importStar(require("../common/logger"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const prompts_1 = require("../common/prompts");
class WebhookHandler extends resource_handler_1.CleanableResourceHandler {
    constructor() {
        super(dc_management_sdk_js_1.Webhook, 'webhooks');
        this.icon = '🪝';
    }
    import(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { hub } = context;
            (0, logger_1.logSubheading)(`[ import ] webhooks`);
            let webhooksionsFile = `${context.tempDir}/content/webhooks/webhooks.json`;
            if (!fs_extra_1.default.existsSync(webhooksionsFile)) {
                logger_1.default.info(`skipped, content/webhooks/webhooks.json not found`);
                return;
            }
            let webhooks = fs_extra_1.default.readJsonSync(webhooksionsFile);
            const existingWebhooks = yield (0, paginator_1.paginator)(hub.related.webhooks.list);
            let createCount = 0;
            yield Promise.all(webhooks.map((wh) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!lodash_1.default.includes(lodash_1.default.map(existingWebhooks, 'label'), wh.label)) {
                        (0, logger_1.logUpdate)(`${prompts_1.prompts.import} webhook [ ${wh.label} ]`);
                        yield hub.related.webhooks.create(wh);
                        createCount++;
                    }
                }
                catch (error) {
                    logger_1.default.error(`${prompts_1.prompts.error} importing webhook [ ${wh.label} ]: ${error.message}`);
                }
            })));
            (0, logger_1.logComplete)(`${this.getDescription()}: [ ${chalk_1.default.green(createCount)} created ]`);
        });
    }
    cleanup(context) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, logger_1.logSubheading)(`[ cleanup ] webhooks`);
            try {
                let deleteCount = 0;
                let webhooks = yield (0, paginator_1.paginator)(context.hub.related.webhooks.list);
                yield Promise.all(webhooks.map((wh) => __awaiter(this, void 0, void 0, function* () {
                    deleteCount++;
                    yield wh.related.delete();
                    (0, logger_1.logUpdate)(`${chalk_1.default.red('delete')} webhook [ ${wh.label} ]`);
                })));
                (0, logger_1.logComplete)(`${this.getDescription()}: [ ${chalk_1.default.red(deleteCount)} deleted ]`);
            }
            catch (error) {
                logger_1.default.error(error.message || error);
            }
        });
    }
}
exports.WebhookHandler = WebhookHandler;
