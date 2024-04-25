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
exports.processAutomationTemplateFiles = exports.setupAutomationTemplateFiles = exports.fetchRemoteTemplateFiles = exports.AUTOMATION_DIR_PATH = void 0;
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importDefault(require("../common/logger"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const environment_manager_1 = require("../common/environment-manager");
const axios_1 = __importDefault(require("axios"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const utils_1 = require("../common/utils");
const types_1 = require("../common/types");
exports.AUTOMATION_DIR_PATH = `${environment_manager_1.CONFIG_PATH}/dc-demostore-automation`;
const fetchRemoteTemplateFiles = () => __awaiter(void 0, void 0, void 0, function* () {
    let url = `https://github.com/amplience/dc-demostore-automation/archive/refs/heads/main.zip`;
    logger_1.default.info(`downloading latest automation files to ${chalk_1.default.blue(exports.AUTOMATION_DIR_PATH)}...`);
    logger_1.default.info(`\t${chalk_1.default.green(url)}`);
    const response = yield (0, axios_1.default)({
        method: 'GET',
        url,
        responseType: 'stream'
    });
    const zipFilePath = `${environment_manager_1.CONFIG_PATH}/main.zip`;
    response.data.pipe(fs_extra_1.default.createWriteStream(zipFilePath));
    return new Promise((resolve, reject) => {
        response.data.on('end', () => __awaiter(void 0, void 0, void 0, function* () {
            logger_1.default.info(`download successful, unzipping...`);
            yield (0, utils_1.sleep)(1000);
            let zip = new adm_zip_1.default(zipFilePath);
            zip.extractAllTo(environment_manager_1.CONFIG_PATH);
            fs_extra_1.default.moveSync(`${environment_manager_1.CONFIG_PATH}/dc-demostore-automation-main`, exports.AUTOMATION_DIR_PATH);
            fs_extra_1.default.rmSync(zipFilePath);
            resolve();
        }));
        response.data.on('error', reject);
    });
});
exports.fetchRemoteTemplateFiles = fetchRemoteTemplateFiles;
const setupAutomationTemplateFiles = (context) => __awaiter(void 0, void 0, void 0, function* () {
    if (context.latest) {
        yield fs_extra_1.default.rm(exports.AUTOMATION_DIR_PATH, { recursive: true, force: true });
    }
    if (!fs_extra_1.default.existsSync(exports.AUTOMATION_DIR_PATH)) {
        yield (0, exports.fetchRemoteTemplateFiles)();
    }
});
exports.setupAutomationTemplateFiles = setupAutomationTemplateFiles;
const processAutomationTemplateFiles = (context) => __awaiter(void 0, void 0, void 0, function* () {
    const contentTempDir = `${context.tempDir}/content`;
    const contentAutomationDir = `${context.automationDir}/content`;
    fs_extra_1.default.mkdirpSync(contentTempDir);
    fs_extra_1.default.copySync(contentAutomationDir, contentTempDir);
    const mapping = yield (0, types_1.getMapping)(context);
    fs_extra_1.default.writeFileSync(`${context.tempDir}/content_mapping.json`, JSON.stringify(mapping, undefined, 4));
    yield (0, utils_1.fileIterator)(contentTempDir, mapping).iterate(() => __awaiter(void 0, void 0, void 0, function* () { }));
});
exports.processAutomationTemplateFiles = processAutomationTemplateFiles;
