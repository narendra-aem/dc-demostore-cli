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
exports.CleanableResourceHandler = exports.ResourceHandler = void 0;
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const lodash_1 = __importDefault(require("lodash"));
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = require("../common/prompts");
const logger_1 = require("../common/logger");
class ResourceHandler {
    constructor(resourceType, resourceTypeDescription) {
        this.resourceType = resourceType;
        this.resourceTypeDescription = resourceTypeDescription;
        this.sortPriority = 1;
        this.icon = '🧩';
        this.resourceType = resourceType;
        this.resourceAction = 'delete';
        if (resourceType) {
            let x = new resourceType();
            this.resourceAction = lodash_1.default.get(x, 'related.delete') ? 'delete' : 'archive';
        }
    }
    getDescription() {
        return `${this.icon}  ${chalk_1.default.cyan(this.resourceTypeDescription)}`;
    }
    getLongDescription() {
        return `${prompts_1.prompts[this.resourceAction]} all ${this.getDescription()}`;
    }
}
exports.ResourceHandler = ResourceHandler;
class CleanableResourceHandler extends ResourceHandler {
    cleanup(context) {
        return __awaiter(this, void 0, void 0, function* () {
            let type = context.hub.related[this.resourceTypeDescription];
            let pagableFn = type && type.list;
            if (!pagableFn) {
                console.log(`not cleaning up for ${this.resourceTypeDescription}`);
                return;
            }
            let pageables = yield (0, dc_demostore_integration_1.paginator)(pagableFn, { status: 'ACTIVE' });
            let actionCount = 0;
            yield Promise.all(pageables.map((y) => __awaiter(this, void 0, void 0, function* () {
                actionCount++;
                yield y.related[this.resourceAction]();
            })));
            let color = this.resourceAction === 'delete' ? chalk_1.default.red : chalk_1.default.yellow;
            (0, logger_1.logComplete)(`${this.getDescription()}: [ ${color(actionCount)} ${this.resourceAction}d ]`);
        });
    }
}
exports.CleanableResourceHandler = CleanableResourceHandler;
