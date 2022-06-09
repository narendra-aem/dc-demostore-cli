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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentMapping = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
class ContentMapping {
    constructor() {
        this.contentItems = new Map();
        this.workflowStates = new Map();
    }
    getContentItem(id) {
        if (id === undefined) {
            return undefined;
        }
        return this.contentItems.get(id);
    }
    registerContentItem(fromId, toId) {
        this.contentItems.set(fromId, toId);
    }
    getWorkflowState(id) {
        if (id === undefined) {
            return undefined;
        }
        return this.workflowStates.get(id);
    }
    registerWorkflowState(fromId, toId) {
        this.workflowStates.set(fromId, toId);
    }
    save(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const obj = {
                contentItems: Array.from(this.contentItems),
                workflowStates: Array.from(this.workflowStates)
            };
            const text = JSON.stringify(obj);
            const dir = (0, path_1.dirname)(filename);
            if (!(yield (0, util_1.promisify)(fs_1.exists)(dir))) {
                yield (0, util_1.promisify)(fs_1.mkdir)(dir);
            }
            yield (0, util_1.promisify)(fs_1.writeFile)(filename, text, { encoding: 'utf8' });
        });
    }
    load(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const text = yield (0, util_1.promisify)(fs_1.readFile)(filename, { encoding: 'utf8' });
                const obj = JSON.parse(text);
                this.contentItems = new Map(obj.contentItems);
                this.workflowStates = new Map(obj.workflowStates);
                return true;
            }
            catch (e) {
                return false;
            }
        });
    }
}
exports.ContentMapping = ContentMapping;
