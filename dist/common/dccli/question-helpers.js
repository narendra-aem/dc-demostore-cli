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
exports.asyncQuestion = void 0;
const readline_1 = __importDefault(require("readline"));
const logger_1 = __importDefault(require("../logger"));
function asyncQuestionInternal(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}
function asyncQuestion(question, log) {
    return __awaiter(this, void 0, void 0, function* () {
        const rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });
        const answer = yield asyncQuestionInternal(rl, question);
        rl.close();
        logger_1.default.info(question + answer, true);
        return answer.length > 0 && answer[0].toLowerCase() === 'y';
    });
}
exports.asyncQuestion = asyncQuestion;
