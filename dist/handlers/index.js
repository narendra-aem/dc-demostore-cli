"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exportables = exports.Importables = exports.Cleanables = exports.Handlers = void 0;
const event_handler_1 = require("./event-handler");
const extension_handler_1 = require("./extension-handler");
const content_item_handler_1 = require("./content-item-handler");
const content_type_handler_1 = require("./content-type-handler");
const content_type_schema_handler_1 = require("./content-type-schema-handler");
const settings_handler_1 = require("./settings-handler");
const webhook_handler_1 = require("./webhook-handler");
const lodash_1 = __importDefault(require("lodash"));
const search_index_handler_1 = require("./search-index-handler");
exports.Handlers = [
    new event_handler_1.EventHandler(),
    new extension_handler_1.ExtensionHandler(),
    new content_item_handler_1.ContentItemHandler(),
    new content_type_handler_1.ContentTypeHandler(),
    new content_type_schema_handler_1.ContentTypeSchemaHandler(),
    new settings_handler_1.SettingsHandler(),
    new webhook_handler_1.WebhookHandler(),
    new search_index_handler_1.SearchIndexHandler()
];
exports.Cleanables = lodash_1.default.filter(exports.Handlers, h => 'cleanup' in h);
exports.Importables = lodash_1.default.filter(exports.Handlers, h => 'import' in h);
exports.Exportables = lodash_1.default.filter(exports.Handlers, h => 'export' in h);
