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
exports.EventHandler = void 0;
const resource_handler_1 = require("./resource-handler");
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const lodash_1 = __importDefault(require("lodash"));
const logger_1 = __importDefault(require("../common/logger"));
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = require("../common/prompts");
class EventHandler extends resource_handler_1.ResourceHandler {
    constructor() {
        super(dc_management_sdk_js_1.Event, 'events');
        this.icon = '📅';
    }
    cleanup(context) {
        return __awaiter(this, void 0, void 0, function* () {
            let events = yield (0, dc_demostore_integration_1.paginator)(context.hub.related.events.list, { status: 'ACTIVE' });
            yield Promise.all(events.map((event) => __awaiter(this, void 0, void 0, function* () {
                let editions = yield (0, dc_demostore_integration_1.paginator)(event.related.editions.list, { status: 'ACTIVE' });
                let publishedEditions = lodash_1.default.filter(editions, e => e.publishingStatus === dc_management_sdk_js_1.PublishingStatus.PUBLISHED);
                yield Promise.all(editions.map((edition) => __awaiter(this, void 0, void 0, function* () {
                    if (edition.publishingStatus !== dc_management_sdk_js_1.PublishingStatus.PUBLISHED) {
                        if (edition.publishingStatus === dc_management_sdk_js_1.PublishingStatus.SCHEDULED) {
                            logger_1.default.info(`${prompts_1.prompts.unschedule} edition [ ${chalk_1.default.gray(edition.name)} ]`);
                            yield edition.related.unschedule();
                        }
                        logger_1.default.info(`${prompts_1.prompts.delete} edition [ ${chalk_1.default.gray(edition.name)} ]`);
                        yield edition.related.delete();
                    }
                })));
                if (publishedEditions.length === 0) {
                    logger_1.default.info(`${prompts_1.prompts.delete} event [ ${chalk_1.default.gray(event.name)} ]`);
                    yield event.related.delete();
                }
            })));
        });
    }
}
exports.EventHandler = EventHandler;
