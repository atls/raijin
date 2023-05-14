import { BaseCommand } from '@yarnpkg/cli';
import { WorkspaceRequiredError } from '@yarnpkg/cli';
import { Configuration } from '@yarnpkg/core';
import { Project } from '@yarnpkg/core';
import { StreamReport } from '@yarnpkg/core';
import { Option } from 'clipanion';
import { getChangedFiles } from './changed-files.util';
class FilesChangedListCommand extends BaseCommand {
    constructor() {
        super(...arguments);
        this.json = Option.Boolean('--json', false);
    }
    async execute() {
        const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
        const { project, workspace } = await Project.find(configuration, this.context.cwd);
        if (!workspace) {
            throw new WorkspaceRequiredError(project.cwd, this.context.cwd);
        }
        const commandReport = await StreamReport.start({
            configuration,
            json: this.json,
            stdout: this.context.stdout,
        }, async (report) => {
            const files = await getChangedFiles(project);
            for (const file of files) {
                report.reportInfo(null, file);
                report.reportJson({
                    location: file,
                });
            }
        });
        return commandReport.exitCode();
    }
}
FilesChangedListCommand.paths = [['files', 'changed', 'list']];
export { FilesChangedListCommand };
