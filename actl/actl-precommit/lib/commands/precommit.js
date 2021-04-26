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
const execa_1 = __importDefault(require("execa"));
const path_1 = require("path");
class PrecommitCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield execa_1.default('lint-staged', ['--config', path_1.join(__dirname, '../config/lint-staged.config.js')], { stdio: 'inherit' });
            }
            catch (error) {
                this.log(error.stderr);
                if (error.exitCode !== 0) {
                    process.exit(error.exitCode === null ? 0 : error.exitCode);
                }
            }
        });
    }
}
exports.default = PrecommitCommand;
PrecommitCommand.description = 'Locally validate the repo before committing';
PrecommitCommand.examples = ['$ actl precommit'];
