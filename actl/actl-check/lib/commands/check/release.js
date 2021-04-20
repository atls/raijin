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
const types_1 = require("../../types");
const github_1 = require("../../github");
class ReleaseCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const plugin = this.config.findCommand('release:build');
                if (!plugin) {
                    throw new Error('actl release:build command dependency not found');
                }
                const command = plugin.load();
                yield command.run([]);
                yield this.check();
            }
            catch (error) {
                yield this.check(error);
            }
        });
    }
    check(error) {
        return __awaiter(this, void 0, void 0, function* () {
            yield github_1.createCheck('Release', error ? types_1.Conclusion.Failure : types_1.Conclusion.Success, {
                title: error ? 'Error build release' : 'Successful',
                summary: error ? error.message : '',
                annotations: [],
            });
        });
    }
}
exports.default = ReleaseCommand;
ReleaseCommand.description = 'Check release build';
ReleaseCommand.examples = ['$ actl check:release'];
