import { readFile } from 'node:fs/promises';
import globby from 'globby';
import ignorer from 'ignore';
import { Linter as ESLinter } from 'eslint';
import { join } from 'path';
import { relative } from 'path';
import eslintconfig from '@atls/config-eslint';
import { ignore } from './linter.patterns';
import { createPatterns } from './linter.patterns';
export class Linter {
    constructor(cwd) {
        this.cwd = cwd;
    }
    async getProjectIgnorePatterns() {
        const content = await readFile(join(this.cwd, 'package.json'), 'utf-8');
        const { linterIgnorePatterns = [] } = JSON.parse(content);
        return linterIgnorePatterns;
    }
    async lint(files) {
        if (files && files.length > 0) {
            return this.lintFiles(files);
        }
        return this.lintProject();
    }
    async lintProject() {
        return this.lintFiles(await globby(createPatterns(this.cwd), { dot: true, nodir: true }));
    }
    async lintFiles(files = []) {
        const ignored = ignorer()
            .add(ignore)
            .add(await this.getProjectIgnorePatterns());
        const linterConfig = { configType: 'flat' };
        const linter = new ESLinter(linterConfig);
        const results = await Promise.all(files
            .filter((file) => ignored.filter([relative(this.cwd, file)]).length !== 0)
            .map(async (filePath) => {
            const source = await readFile(filePath, 'utf8');
            const messages = linter.verify(source, eslintconfig, { filename: filePath });
            return {
                filePath,
                source,
                messages,
                errorCount: messages.filter((message) => message.severity === 1).length,
                fatalErrorCount: messages.filter((message) => message.severity === 0).length,
                warningCount: messages.filter((message) => message.severity === 2).length,
                fixableErrorCount: 0,
                fixableWarningCount: 0,
                usedDeprecatedRules: [],
            };
        }));
        return results;
    }
}
