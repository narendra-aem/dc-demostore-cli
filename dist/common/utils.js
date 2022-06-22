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
exports.getRandom = exports.formatPercentage = exports.fileIterator = exports.sleep = void 0;
const lodash_1 = __importDefault(require("lodash"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const handlebars_1 = require("handlebars");
const chalk_1 = __importDefault(require("chalk"));
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
exports.sleep = sleep;
const fileIterator = (dir, mapping) => ({
    iterate: (fn) => __awaiter(void 0, void 0, void 0, function* () {
        return lodash_1.default.compact(lodash_1.default.flatten(yield Promise.all(lodash_1.default.reject(fs_extra_1.default.readdirSync(dir), dir => dir.startsWith('.')).map((file) => __awaiter(void 0, void 0, void 0, function* () {
            let path = `${dir}/${file}`;
            let stats = fs_extra_1.default.statSync(path);
            if (stats.isDirectory()) {
                return yield (0, exports.fileIterator)(path, mapping).iterate(fn);
            }
            else {
                let contents = {};
                if (path.endsWith('.hbs')) {
                    let fileContents = fs_extra_1.default.readFileSync(path, 'utf-8');
                    const template = (0, handlebars_1.compile)(fileContents);
                    contents = JSON.parse(template(mapping));
                    fs_extra_1.default.unlinkSync(path);
                    path = path.replace('.hbs', '');
                    fs_extra_1.default.writeJsonSync(path, contents);
                }
                else {
                    contents = fs_extra_1.default.readJsonSync(path);
                }
                return yield fn({
                    path,
                    object: contents
                });
            }
        })))));
    })
});
exports.fileIterator = fileIterator;
const formatPercentage = (a, b) => {
    let percentage = Math.ceil(100.0 * a.length / b.length);
    let colorFn = chalk_1.default.green;
    if (percentage > 66) {
        colorFn = chalk_1.default.red;
    }
    else if (percentage > 33) {
        colorFn = chalk_1.default.yellow;
    }
    return `[ ${colorFn(`${a.length} (${percentage}%)`)} ]`;
};
exports.formatPercentage = formatPercentage;
const getRandom = (array) => array[Math.floor(Math.random() * (array.length - 1))];
exports.getRandom = getRandom;
