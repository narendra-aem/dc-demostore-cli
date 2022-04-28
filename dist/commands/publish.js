"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const amplience_helper_1 = __importDefault(require("../common/amplience-helper"));
const middleware_1 = require("../common/middleware");
const amplience_builder_1 = __importDefault(require("../common/amplience-builder"));
exports.command = 'publish';
exports.desc = "Publish unpublished content items";
exports.builder = amplience_builder_1.default;
exports.handler = (0, middleware_1.contextHandler)(amplience_helper_1.default.publishAll);
