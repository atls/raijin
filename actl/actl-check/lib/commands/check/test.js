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
class TestCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const reportPath = path_1.join(os_1.tmpdir(), `jest-report-${new Date().getTime()}.json`);
            try {
                yield execa_1.default('jest', [
                    '--config',
                    config_1.JEST_CONFIG_PATH,
                    '--json',
                    '--outputFile',
                    reportPath,
                    '--testLocationInResults',
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
    check({ testResults }) {
        return __awaiter(this, void 0, void 0, function* () {
            const cwd = process.env.GITHUB_WORKSPACE || process.cwd();
            const assertions = testResults
                .reduce((result, testResult) => [
                ...result,
                ...testResult.assertionResults.map((assertion) => (Object.assign(Object.assign({}, assertion), { path: testResult.name.substring(cwd.length + 1) }))),
            ], [])
                .filter((assertion) => assertion.status === 'failed');
            const annotations = assertions.map((assertion) => ({
                path: assertion.path,
                start_line: assertion.location.line + 1,
                end_line: assertion.location.line + 1,
                annotation_level: types_1.AnnotationLevel.Failure,
                raw_details: assertion.failureMessages.join('\n'),
                title: assertion.ancestorTitles.join(' '),
                message: assertion.title,
            }));
            yield github_1.createCheck('Test', annotations.length > 0 ? types_1.Conclusion.Failure : types_1.Conclusion.Success, {
                title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
                summary: annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
                annotations,
            });
        });
    }
}
exports.default = TestCommand;
TestCommand.description = 'Check test via jest';
TestCommand.examples = ['$ actl check:test'];
