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
const os_1 = require("os");
const path_1 = require("path");
const config_1 = require("@atlantis-lab/config");
const types_1 = require("../../types");
const github_1 = require("../../github");
const utils_1 = require("../../utils");
const getAnnotationLevel = (severity) => {
    if (severity === 1) {
        return types_1.AnnotationLevel.Warning;
    }
    return types_1.AnnotationLevel.Failure;
};
class LintCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const reportPath = path_1.join(os_1.tmpdir(), `eslint-report-${new Date().getTime()}.json`);
            try {
                yield execa_1.default('eslint', [
                    '--ext',
                    'js,ts,jsx,tsx',
                    process.cwd(),
                    '--config',
                    config_1.ESLINT_CONFIG_PATH,
                    '--ignore-path',
                    config_1.ESLINT_IGNORE_PATH,
                    '--format',
                    'json-with-metadata',
                    '-o',
                    reportPath,
                ]);
            }
            catch (error) {
                if (!(yield utils_1.isReportExists(reportPath))) {
                    this.log(error.stderr);
                }
            }
            yield this.check(require(reportPath));
        });
    }
    check({ results }) {
        return __awaiter(this, void 0, void 0, function* () {
            const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
            const annotations = [];
            results.forEach(({ filePath, messages = [] }) => {
                if (messages.length === 0) {
                    return;
                }
                messages.forEach((message) => {
                    const line = (message.line || 0) + 1;
                    annotations.push({
                        path: filePath.substring(cwd.length + 1),
                        start_line: line,
                        end_line: line,
                        annotation_level: getAnnotationLevel(message.severity),
                        raw_details: `(${message.ruleId}): ${message.message}`,
                        title: message.ruleId || 'unknown/rule',
                        message: message.message,
                    });
                });
            });
            const warnings = annotations.filter((annotation) => annotation.annotation_level === 'warning')
                .length;
            const errors = annotations.filter((annotation) => annotation.annotation_level === 'failure')
                .length;
            yield github_1.createCheck('Lint', annotations.length > 0 ? types_1.Conclusion.Failure : types_1.Conclusion.Success, {
                title: annotations.length > 0 ? `Errors ${errors}, Warnings ${warnings}` : 'Successful',
                summary: annotations.length > 0
                    ? `Found ${errors} errors and ${warnings} warnings`
                    : 'All checks passed',
                annotations,
            });
        });
    }
}
exports.default = LintCommand;
LintCommand.description = 'Check ESLint to statically analyze your code';
LintCommand.examples = ['$ actl check:lint'];
