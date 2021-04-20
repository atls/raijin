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
const execa_1 = __importDefault(require("execa"));
const command_1 = require("@oclif/command");
const config_1 = require("@atlantis-lab/config");
const types_1 = require("../../types");
const github_1 = require("../../github");
const formatResultError = (error) => `✖   ${error.message} [${error.name}]`;
const formatResultStatus = (errors, warnings) => `${errors.length === 0 && warnings.length === 0 ? '✔' : '✖'}   found ${errors.length} problems, ${warnings.length} warnings`;
const formatResult = ({ input, errors = [], warnings = [] }) => `
⧗   input: ${input}
${[
    ...errors.map(formatResultError),
    ...warnings.map(formatResultError),
    formatResultStatus(errors, warnings),
].join('\n')}
`;
class CommitLintCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const messages = yield github_1.getPullCommitsMessages();
                const { stdout } = yield execa_1.default('commitlint', [`--config=${config_1.COMMITLINT_CONFIG_PATH}`, '-o', 'commitlint-format-json'], { input: messages.join('\n') });
                yield this.check(JSON.parse(stdout));
            }
            catch (error) {
                yield this.check(JSON.parse(error.stdout));
            }
        });
    }
    check({ valid, results }) {
        return __awaiter(this, void 0, void 0, function* () {
            yield github_1.createCheck('CommitLint', valid ? types_1.Conclusion.Success : types_1.Conclusion.Failure, {
                title: valid ? 'Successful' : `Errors ${results.length}`,
                summary: results.map(formatResult).join('\n'),
                annotations: [],
            });
        });
    }
}
exports.default = CommitLintCommand;
CommitLintCommand.description = 'Check commit message';
CommitLintCommand.examples = ['$ actl check:commitlint'];
