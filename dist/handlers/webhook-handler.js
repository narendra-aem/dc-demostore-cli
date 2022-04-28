"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookHandler = void 0;
const resource_handler_1 = require("./resource-handler");
const dc_management_sdk_js_1 = require("dc-management-sdk-js");
class WebhookHandler extends resource_handler_1.CleanableResourceHandler {
    constructor() {
        super(dc_management_sdk_js_1.Webhook, 'webhooks');
        this.icon = '📢';
    }
}
exports.WebhookHandler = WebhookHandler;
