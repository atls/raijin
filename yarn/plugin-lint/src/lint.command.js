import { BaseCommand } from '@yarnpkg/cli';
import { StreamReport } from '@yarnpkg/core';
import { Configuration } from '@yarnpkg/core';
import { MessageName } from '@yarnpkg/core';
import { Project } from '@yarnpkg/core';
import React from 'react';
import { Option } from 'clipanion';
import { ErrorInfo } from '@atls/cli-ui-error-info-component';
import { ESLintResult } from '@atls/cli-ui-eslint-result-component';
import { LinterWorker } from '@atls/code-lint-worker';
import { SpinnerProgress } from '@atls/yarn-run-utils';
import { renderStatic } from '@atls/cli-ui-renderer';
class LintCommand extends BaseCommand {
    constructor() {
        super(...arguments);
        this.files = Option.Rest({ required: 0 });
    }
    async execute() {
        const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
        const { project } = await Project.find(configuration, this.context.cwd);
        const commandReport = await StreamReport.start({
            stdout: this.context.stdout,
            configuration,
        }, async (report) => {
            await report.startTimerPromise('Lint', async () => {
                const progress = new SpinnerProgress(this.context.stdout, configuration);
                progress.start();
                try {
                    const results = await new LinterWorker(project.cwd).run(this.files);
                    progress.end();
                    results
                        .filter((result) => result.messages.length > 0)
                        .forEach((result) => {
                        const output = renderStatic(React.createElement(ESLintResult, { ...result }));
                        output.split('\n').forEach((line) => report.reportError(MessageName.UNNAMED, line));
                    });
                }
                catch (error) {
                    progress.end();
                    renderStatic(React.createElement(ErrorInfo, { error: error }), process.stdout.columns - 12)
                        .split('\n')
                        .forEach((line) => {
                        report.reportError(MessageName.UNNAMED, line);
                    });
                }
            });
        });
        return commandReport.exitCode();
    }
}
LintCommand.paths = [['lint']];
export { LintCommand };
