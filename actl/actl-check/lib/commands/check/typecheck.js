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
const types_1 = require("../../types");
const github_1 = require("../../github");
const getAnnotationLevel = level => {
    if (level !== 'failure') {
        return types_1.AnnotationLevel.Warning;
    }
    return types_1.AnnotationLevel.Failure;
};
const formatLine = line => {
    const [file, rule, message] = line.split(':');
    const [filePath, position] = file.split(/\(|\)/).filter(f => f);
    const [startLine] = position.split(',');
    const [level] = rule.trim().split(' ');
    return {
        path: filePath,
        start_line: Number(startLine || 0),
        end_line: Number(startLine || 0),
        annotation_level: getAnnotationLevel(level),
        title: rule.trim(),
        message: message.trim(),
        raw_details: `(${rule.trim()}): ${message.trim()}`,
    };
};
class TypecheckCommand extends command_1.Command {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield execa_1.default('tsc', ['--noEmit', '-p', process.cwd(), '--pretty', 'false']);
                yield this.check(result.all);
            }
            catch (error) {
                yield this.check(error.all);
            }
        });
    }
    check(output = '') {
        return __awaiter(this, void 0, void 0, function* () {
            const annotations = output
                .split('\n')
                .reduce((result, line, index) => {
                if (line.includes(' TS')) {
                    return [...result, line];
                }
                if (result.length > 0 && result[result.length - 1]) {
                    result[result.length - 1] = result[result.length - 1] + line;
                }
                return result;
            }, [])
                .map(formatLine);
            yield github_1.createCheck('TypeCheck', annotations.length > 0 ? types_1.Conclusion.Failure : types_1.Conclusion.Success, {
                title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
                summary: annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
                annotations,
            });
        });
    }
}
exports.default = TypecheckCommand;
TypecheckCommand.description = 'Check TypeScript via tsc';
TypecheckCommand.examples = ['$ actl check:typecheck'];
