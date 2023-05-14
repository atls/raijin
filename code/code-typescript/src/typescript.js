import { readFile } from 'node:fs/promises';
import deepmerge from 'deepmerge';
import ts from 'typescript';
import { join } from 'path';
import tsconfig from '@atls/config-typescript';
class TypeScript {
    constructor(cwd) {
        this.cwd = cwd;
    }
    async getProjectIgnorePatterns() {
        const content = await readFile(join(this.cwd, 'package.json'), 'utf-8');
        const { typecheckIgnorePatterns = [] } = JSON.parse(content);
        return typecheckIgnorePatterns;
    }
    check(include = []) {
        return this.run(include);
    }
    build(include = [], override = {}) {
        return this.run(include, override, false);
    }
    async run(include = [], override = {}, noEmit = true) {
        const projectIgnorePatterns = await this.getProjectIgnorePatterns();
        const config = deepmerge(tsconfig, { compilerOptions: override, exclude: [...tsconfig.exclude, ...projectIgnorePatterns] }, {
            include,
        });
        const { fileNames, options, errors } = ts.parseJsonConfigFileContent(config, ts.sys, this.cwd);
        if ((errors === null || errors === void 0 ? void 0 : errors.length) > 0) {
            return errors;
        }
        const program = ts.createProgram(fileNames, {
            ...options,
            noEmit,
        });
        const result = program.emit();
        return ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
    }
}
export { TypeScript };
