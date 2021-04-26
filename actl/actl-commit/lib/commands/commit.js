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
const command_1 = require("@oclif/command");
const git_cz_1 = require("commitizen/dist/cli/git-cz");
class CommitCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                git_cz_1.bootstrap({
                    cliPath: require.resolve('commitizen/package.json').replace('package.json', ''),
                    config: {
                        path: require.resolve('cz-lerna-changelog'),
                    },
                }, [null, ...this.argv]);
            }
            catch (error) {
                this.log(error.message);
                process.exit(1);
            }
        });
    }
}
exports.default = CommitCommand;
CommitCommand.description = 'Create Commitizen commit from staged files';
CommitCommand.examples = ['$ actl commit'];
