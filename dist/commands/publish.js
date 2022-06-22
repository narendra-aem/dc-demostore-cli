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
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const middleware_1 = require("../common/middleware");
const amplience_builder_1 = __importDefault(require("../common/amplience-builder"));
exports.command = 'publish';
exports.desc = "Publish unpublished content items";
exports.builder = amplience_builder_1.default;
exports.handler = (0, middleware_1.contextHandler)((context) => __awaiter(void 0, void 0, void 0, function* () {
    yield context.amplienceHelper.publishAll();
}));
