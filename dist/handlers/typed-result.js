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
exports.timed = void 0;
const timed = (tag, block) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`timed start: ${tag}`);
    const start = new Date().valueOf();
    let result = yield block();
    let duration = new Date().valueOf() - start;
    console.log(`timed end: ${tag} ${duration}ms`);
    return { tag, duration, result };
});
exports.timed = timed;
