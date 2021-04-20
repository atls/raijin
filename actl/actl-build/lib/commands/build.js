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
const lerna_1 = require("../lerna");
class BuildCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const { argv, flags: { changes }, } = this.parse(BuildCommand);
            if (changes) {
                const packages = yield lerna_1.getChangedPackages(argv);
                const scopes = packages.map(({ name }) => `--scope=${name}`);
                if (scopes.length > 0) {
                    yield execa_1.default('yarn', ['lerna', ...scopes, 'run', 'build'], {
                        stdio: 'inherit',
                    });
                }
            }
            else {
                yield execa_1.default('yarn', ['lerna', 'run', 'build'], {
                    stdio: 'inherit',
                });
            }
        });
    }
}
exports.default = BuildCommand;
BuildCommand.description = 'Build release';
BuildCommand.examples = ['$ actl release:build'];
BuildCommand.strict = false;
BuildCommand.flags = {
    changes: command_1.flags.boolean({
        char: 'c',
        description: 'Build only changes',
        default: false,
    }),
};
