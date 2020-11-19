var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import execa from 'execa';
import { Command } from '@oclif/command';
import { tmpdir } from 'os';
import { join } from 'path';
import { ESLINT_CONFIG_PATH, ESLINT_IGNORE_PATH } from '@atlantis-lab/config';
import { AnnotationLevel, Conclusion } from '../../types';
import { createCheck } from '../../github';
import { isReportExists } from '../../utils';
var getAnnotationLevel = function (severity) {
    if (severity === 1) {
        return AnnotationLevel.Warning;
    }
    return AnnotationLevel.Failure;
};
var LintCommand = (function (_super) {
    __extends(LintCommand, _super);
    function LintCommand() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    LintCommand.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var reportPath, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        reportPath = join(tmpdir(), "eslint-report-" + new Date().getTime() + ".json");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 5]);
                        return [4, execa('eslint', [
                                '--ext',
                                'js,ts,jsx,tsx',
                                process.cwd(),
                                '--config',
                                ESLINT_CONFIG_PATH,
                                '--ignore-path',
                                ESLINT_IGNORE_PATH,
                                '--format',
                                'json-with-metadata',
                                '-o',
                                reportPath,
                            ])];
                    case 2:
                        _a.sent();
                        return [3, 5];
                    case 3:
                        error_1 = _a.sent();
                        return [4, isReportExists(reportPath)];
                    case 4:
                        if (!(_a.sent())) {
                            this.log(error_1.stderr);
                        }
                        return [3, 5];
                    case 5: return [4, this.check(require(reportPath))];
                    case 6:
                        _a.sent();
                        return [2];
                }
            });
        });
    };
    LintCommand.prototype.check = function (_a) {
        var results = _a.results;
        return __awaiter(this, void 0, void 0, function () {
            var cwd, annotations, warnings, errors;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        cwd = process.env.GITHUB_WORKSPACE || process.cwd();
                        annotations = [];
                        results.forEach(function (_a) {
                            var filePath = _a.filePath, _b = _a.messages, messages = _b === void 0 ? [] : _b;
                            if (messages.length === 0) {
                                return;
                            }
                            messages.forEach(function (message) {
                                var line = (message.line || 0) + 1;
                                annotations.push({
                                    path: filePath.substring(cwd.length + 1),
                                    start_line: line,
                                    end_line: line,
                                    annotation_level: getAnnotationLevel(message.severity),
                                    raw_details: "(" + message.ruleId + "): " + message.message,
                                    title: message.ruleId || 'unknown/rule',
                                    message: message.message,
                                });
                            });
                        });
                        warnings = annotations.filter(function (annotation) { return annotation.annotation_level === 'warning'; })
                            .length;
                        errors = annotations.filter(function (annotation) { return annotation.annotation_level === 'failure'; })
                            .length;
                        return [4, createCheck('Lint', annotations.length > 0 ? Conclusion.Failure : Conclusion.Success, {
                                title: annotations.length > 0 ? "Errors " + errors + ", Warnings " + warnings : 'Successful',
                                summary: annotations.length > 0
                                    ? "Found " + errors + " errors and " + warnings + " warnings"
                                    : 'All checks passed',
                                annotations: annotations,
                            })];
                    case 1:
                        _b.sent();
                        return [2];
                }
            });
        });
    };
    LintCommand.description = 'Check ESLint to statically analyze your code';
    LintCommand.examples = ['$ actl check:lint'];
    return LintCommand;
}(Command));
export default LintCommand;
