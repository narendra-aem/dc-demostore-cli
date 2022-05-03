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
exports.getMapping = void 0;
const lodash_1 = __importDefault(require("lodash"));
const dc_demostore_integration_1 = require("@amplience/dc-demostore-integration");
const getMapping = (context) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    let repositories = yield dc_demostore_integration_1.paginator(context.hub.related.contentRepositories.list);
    let workflowStates = yield dc_demostore_integration_1.paginator(context.hub.related.workflowStates.list);
    return {
        url: context.environment.url,
        cms: {
            hub: (_a = context.config) === null || _a === void 0 ? void 0 : _a.cms.hub,
            hubs: (_b = context.config) === null || _b === void 0 ? void 0 : _b.cms.hubs,
            repositories: lodash_1.default.zipObject(lodash_1.default.map(repositories, r => r.name), lodash_1.default.map(repositories, 'id')),
            workflowStates: lodash_1.default.zipObject(lodash_1.default.map(workflowStates, ws => lodash_1.default.camelCase(ws.label)), lodash_1.default.map(workflowStates, 'id'))
        },
        algolia: (_c = context.config) === null || _c === void 0 ? void 0 : _c.algolia,
        dam: yield context.amplienceHelper.getDAMMapping(),
        contentMap: context.amplienceHelper.getContentMap()
    };
});
exports.getMapping = getMapping;
