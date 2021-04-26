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
const command_1 = require("@oclif/command");
const commitlint_1 = __importDefault(require("./commitlint"));
const lint_1 = __importDefault(require("./lint"));
const test_1 = __importDefault(require("./test"));
const typecheck_1 = __importDefault(require("./typecheck"));
class AllCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const commands = [commitlint_1.default, lint_1.default, test_1.default, typecheck_1.default];
            yield Promise.all(commands.map((command) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield command.run([]);
                }
                catch (error) {
                    console.log(error);
                }
            })));
        });
    }
}
exports.default = AllCommand;
AllCommand.description = 'Run all checks';
AllCommand.examples = ['$ actl check:all'];
