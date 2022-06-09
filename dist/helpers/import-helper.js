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
exports.copyTemplateFilesToTempDir = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const utils_1 = require("../common/utils");
const types_1 = require("../common/types");
const copyTemplateFilesToTempDir = (context) => __awaiter(void 0, void 0, void 0, function* () {
    let contentFolder = `${context.tempDir}/content`;
    let folder = `${context.automationDir}/content`;
    fs_extra_1.default.mkdirpSync(contentFolder);
    fs_extra_1.default.copySync(folder, contentFolder);
    let mapping = yield (0, types_1.getMapping)(context);
    fs_extra_1.default.writeFileSync(`${context.tempDir}/content_mapping.json`, JSON.stringify(mapping, undefined, 4));
    yield (0, utils_1.fileIterator)(contentFolder, mapping).iterate(() => __awaiter(void 0, void 0, void 0, function* () {
    }));
});
exports.copyTemplateFilesToTempDir = copyTemplateFilesToTempDir;
