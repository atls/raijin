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
const config_1 = require("@atlantis-lab/config");
const path_1 = require("path");
class FormatCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield execa_1.default('prettier', [
                    '--write',
                    '--config',
                    config_1.PRETTIER_CONFIG_PATH,
                    '--ignore-path',
                    config_1.PRETTIER_IGNORE_PATH,
                    path_1.join(process.cwd(), './**/*.{js,ts,tsx,yml,yaml,json,graphql,md,mdx}'),
                ], { stdio: 'inherit' });
            }
            catch (error) {
                this.log(error.stderr);
            }
        });
    }
}
exports.default = FormatCommand;
FormatCommand.description = 'Prettier format';
FormatCommand.examples = ['$ actl format'];
