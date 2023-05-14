import { StreamReport } from '@yarnpkg/core';
import { Configuration } from '@yarnpkg/core';
import { Project } from '@yarnpkg/core';
import { TesterWorker } from '@atls/code-test-worker';
import { AbstractChecksTestCommand } from './abstract-checks-test.command';
import { GitHubChecks } from './github.checks';
class ChecksTestIntegrationCommand extends AbstractChecksTestCommand {
    async execute() {
        const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
        const { project } = await Project.find(configuration, this.context.cwd);
        const commandReport = await StreamReport.start({
            stdout: this.context.stdout,
            configuration,
        }, async () => {
            const checks = new GitHubChecks('Test:Integration');
            const { id: checkId } = await checks.start();
            try {
                const results = await new TesterWorker(project.cwd).run('integration');
                const annotations = this.formatResults(results, project.cwd);
                await checks.complete(checkId, {
                    title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
                    summary: annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
                    annotations,
                });
            }
            catch (error) {
                await checks.failure({
                    title: 'Test:Integration run failed',
                    summary: error.message,
                });
            }
        });
        return commandReport.exitCode();
    }
}
ChecksTestIntegrationCommand.paths = [['checks', 'test', 'integration']];
export { ChecksTestIntegrationCommand };
