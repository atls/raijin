import { EOL } from 'node:os';
import { BaseCommand } from '@yarnpkg/cli';
import { Configuration } from '@yarnpkg/core';
import { Project } from '@yarnpkg/core';
import { StreamReport } from '@yarnpkg/core';
import { MessageName } from '@yarnpkg/core';
import { codeFrameColumns } from '@babel/code-frame';
import { xfs } from '@yarnpkg/fslib';
import { ppath } from '@yarnpkg/fslib';
import React from 'react';
import { TypeScriptDiagnostic } from '@atls/cli-ui-typescript-diagnostic-component';
import { TypeScriptWorker } from '@atls/code-typescript-worker';
import { renderStatic } from '@atls/cli-ui-renderer';
import { flattenDiagnosticMessageText } from '@atls/code-typescript';
import { getLineAndCharacterOfPosition } from '@atls/code-typescript';
import { GitHubChecks } from './github.checks';
import { AnnotationLevel } from './github.checks';
class ChecksTypeCheckCommand extends BaseCommand {
    async execute() {
        const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
        const { project } = await Project.find(configuration, this.context.cwd);
        const commandReport = await StreamReport.start({
            stdout: this.context.stdout,
            configuration,
        }, async (report) => {
            await report.startTimerPromise('Type Check', async () => {
                const checks = new GitHubChecks('TypeCheck');
                const { id: checkId } = await checks.start();
                try {
                    const ts = new TypeScriptWorker(project.cwd);
                    const diagnostics = await ts.check(project.topLevelWorkspace.manifest.workspaceDefinitions.map((definition) => definition.pattern));
                    diagnostics.forEach((diagnostic) => {
                        const output = renderStatic(React.createElement(TypeScriptDiagnostic, { ...diagnostic }));
                        output.split('\n').forEach((line) => report.reportInfo(MessageName.UNNAMED, line));
                    });
                    const annotations = [];
                    diagnostics.forEach((diagnostic) => {
                        if (diagnostic.file) {
                            const position = diagnostic.file.lineMap && diagnostic.start
                                ? getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start)
                                : null;
                            annotations.push({
                                path: ppath.normalize(ppath.relative(project.cwd, diagnostic.file.fileName)),
                                title: flattenDiagnosticMessageText(diagnostic.messageText, EOL)
                                    .split(EOL)
                                    .at(0),
                                message: flattenDiagnosticMessageText(diagnostic.messageText, EOL),
                                start_line: position ? position.line + 1 : 0,
                                end_line: position ? position.line + 1 : 0,
                                raw_details: position
                                    ? codeFrameColumns(xfs.readFileSync(diagnostic.file.fileName).toString(), {
                                        start: {
                                            line: position.line + 1,
                                            column: position.character + 1,
                                        },
                                    }, { highlightCode: false })
                                    : flattenDiagnosticMessageText(diagnostic.messageText, EOL),
                                annotation_level: AnnotationLevel.Failure,
                            });
                        }
                    });
                    await checks.complete(checkId, {
                        title: diagnostics.length > 0 ? `Errors ${annotations.length}` : 'Successful',
                        summary: diagnostics.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
                        annotations,
                    });
                }
                catch (error) {
                    await checks.failure({
                        title: 'TypeCheck run failed',
                        summary: error.message,
                    });
                }
            });
        });
        return commandReport.exitCode();
    }
}
ChecksTypeCheckCommand.paths = [['checks', 'typecheck']];
export { ChecksTypeCheckCommand };
