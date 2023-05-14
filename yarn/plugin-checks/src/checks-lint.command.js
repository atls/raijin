import { readFileSync } from 'node:fs';
import { BaseCommand } from '@yarnpkg/cli';
import { StreamReport } from '@yarnpkg/core';
import { Configuration } from '@yarnpkg/core';
import { MessageName } from '@yarnpkg/core';
import { Project } from '@yarnpkg/core';
import { codeFrameColumns } from '@babel/code-frame';
import React from 'react';
import { ESLintResult } from '@atls/cli-ui-eslint-result-component';
import { LinterWorker } from '@atls/code-lint-worker';
import { renderStatic } from '@atls/cli-ui-renderer';
import { GitHubChecks } from './github.checks';
import { AnnotationLevel } from './github.checks';
class ChecksLintCommand extends BaseCommand {
    async execute() {
        const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
        const { project } = await Project.find(configuration, this.context.cwd);
        const commandReport = await StreamReport.start({
            stdout: this.context.stdout,
            configuration,
        }, async (report) => {
            const checks = new GitHubChecks('Lint');
            const { id: checkId } = await checks.start();
            const results = await report.startTimerPromise('Lint', async () => {
                try {
                    return await new LinterWorker(project.cwd).run();
                }
                catch (error) {
                    await checks.failure({
                        title: 'Lint run failed',
                        summary: error.message,
                    });
                }
            });
            if (results) {
                results
                    .filter((result) => result.messages.length > 0)
                    .forEach((result) => {
                    const output = renderStatic(React.createElement(ESLintResult, { ...result }));
                    output.split('\n').forEach((line) => report.reportInfo(MessageName.UNNAMED, line));
                });
                const annotations = this.formatResults(results, project.cwd);
                const warnings = annotations.filter((annotation) => annotation.annotation_level === 'warning').length;
                const errors = annotations.filter((annotation) => annotation.annotation_level === 'failure').length;
                await checks.complete(checkId, {
                    title: annotations.length > 0 ? `Errors ${errors}, Warnings ${warnings}` : 'Successful',
                    summary: annotations.length > 0
                        ? `Found ${errors} errors and ${warnings} warnings`
                        : 'All checks passed',
                    annotations,
                });
            }
        });
        return commandReport.exitCode();
    }
    getAnnotationLevel(severity) {
        if (severity === 1) {
            return AnnotationLevel.Warning;
        }
        return AnnotationLevel.Failure;
    }
    formatResults(results, cwd) {
        return results
            .filter((result) => { var _a; return ((_a = result.messages) === null || _a === void 0 ? void 0 : _a.length) > 0; })
            .map(({ filePath, messages = [] }) => messages.map((message) => {
            const line = (message.line || 0) + 1;
            return {
                path: cwd ? filePath.substring(cwd.length + 1) : filePath,
                start_line: line,
                end_line: line,
                annotation_level: this.getAnnotationLevel(message.severity),
                raw_details: codeFrameColumns(readFileSync(filePath).toString(), {
                    start: { line: message.line || 0, column: message.column || 0 },
                }, { highlightCode: false }),
                title: `(${message.ruleId}): ${message.message}`,
                message: message.message,
            };
        }))
            .flat();
    }
}
ChecksLintCommand.paths = [['checks', 'lint']];
export { ChecksLintCommand };
