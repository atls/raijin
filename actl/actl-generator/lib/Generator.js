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
exports.Generator = void 0;
class Generator {
    constructor(options) {
        this.options = options;
    }
    generate() {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = [];
            if (this.options.defaultHandler !== null) {
                entries.push([this.options.defaultHandler, this.options.allProperties]);
            }
            const promises = entries
                .concat(Array.from(this.options.strategyRouter.entries()))
                .map(([handler, properties]) => __awaiter(this, void 0, void 0, function* () {
                const rawResult = yield handler();
                return properties.reduce((result, property) => {
                    let patch = null;
                    if (property !== undefined) {
                        patch = {
                            [property]: typeof rawResult === 'object' ? rawResult[property] : rawResult,
                        };
                    }
                    return Object.assign(Object.assign({}, result), patch);
                }, {});
            }));
            const results = yield Promise.all(promises);
            return results.reduce((result, chunk) => (Object.assign(Object.assign({}, result), chunk)), {});
        });
    }
}
exports.Generator = Generator;
