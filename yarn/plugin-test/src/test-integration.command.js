import { BaseCommand } from '@yarnpkg/cli';
import { StreamReport } from '@yarnpkg/core';
import { Configuration } from '@yarnpkg/core';
import { Project } from '@yarnpkg/core';
import { Option } from 'clipanion';
import { TesterWorker } from '@atls/code-test-worker';
class TestIntegrationCommand extends BaseCommand {
    constructor() {
        super(...arguments);
        this.bail = Option.Boolean('-b,--bail', false);
        this.updateSnapshot = Option.Boolean('-u,--update-shapshot', false);
        this.findRelatedTests = Option.Boolean('--find-related-tests', false);
        this.files = Option.Rest({ required: 0 });
    }
    async execute() {
        const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
        const { project, workspace } = await Project.find(configuration, this.context.cwd);
        const args = [];
        if (workspace) {
            const scope = this.context.cwd.replace(project.cwd, '');
            args.push(scope.startsWith('/') ? scope.substr(1) : scope);
        }
        const commandReport = await StreamReport.start({
            stdout: this.context.stdout,
            configuration,
        }, async () => {
            await new TesterWorker(project.cwd).run('integration', {
                findRelatedTests: this.findRelatedTests,
                updateSnapshot: this.updateSnapshot,
                bail: this.bail,
            }, args.concat(this.files));
        });
        return commandReport.exitCode();
    }
}
TestIntegrationCommand.paths = [['test', 'integration']];
export { TestIntegrationCommand };
