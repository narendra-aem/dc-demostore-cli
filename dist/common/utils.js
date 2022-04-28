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
exports.getRandom = exports.getRandomInt = exports.fileIterator = exports.sleep = void 0;
const lodash_1 = __importDefault(require("lodash"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const handlebars_1 = require("handlebars");
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
exports.sleep = sleep;
const fileIterator = (dir, context) => {
    return {
        iterate: (fn) => __awaiter(void 0, void 0, void 0, function* () {
            let files = lodash_1.default.reject(fs_extra_1.default.readdirSync(dir), dir => dir.startsWith('.'));
            return lodash_1.default.compact(lodash_1.default.flatten(yield Promise.all(files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                let path = `${dir}/${file}`;
                let stats = fs_extra_1.default.statSync(path);
                if (stats.isDirectory()) {
                    return yield (0, exports.fileIterator)(path, context).iterate(fn);
                }
                else {
                    let contents = {};
                    if (path.endsWith('.hbs')) {
                        let fileContents = fs_extra_1.default.readFileSync(path, 'utf-8');
                        const template = (0, handlebars_1.compile)(fileContents);
                        contents = JSON.parse(template(context.mapping));
                        fs_extra_1.default.unlinkSync(path);
                        path = path.replace('.hbs', '');
                        fs_extra_1.default.writeJsonSync(path, contents);
                    }
                    else {
                        contents = fs_extra_1.default.readJsonSync(path);
                    }
                    let schemaId = ((_b = (_a = contents.body) === null || _a === void 0 ? void 0 : _a._meta) === null || _b === void 0 ? void 0 : _b.schema) ||
                        contents.schemaId ||
                        contents['$id'] ||
                        contents.contentTypeUri;
                    if (!lodash_1.default.isEmpty(schemaId) && !lodash_1.default.isEmpty(context.matchingSchema) &&
                        !lodash_1.default.includes(context.matchingSchema, schemaId)) {
                        fs_extra_1.default.unlinkSync(path);
                    }
                    return yield fn({
                        path,
                        object: contents
                    });
                }
            })))));
        })
    };
};
exports.fileIterator = fileIterator;
const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
};
exports.getRandomInt = getRandomInt;
const getRandom = (array) => {
    if (Array.isArray(array)) {
        let index = (0, exports.getRandomInt)(array.length + 1);
        return array[index];
    }
    else {
        return array;
    }
};
exports.getRandom = getRandom;
