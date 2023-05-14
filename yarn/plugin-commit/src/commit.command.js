import { BaseCommand } from '@yarnpkg/cli';
import { Option } from 'clipanion';
class CommitCommand extends BaseCommand {
    constructor() {
        super(...arguments);
        this.args = Option.Rest({ required: 0 });
    }
    async execute() {
        await this.cli.run(['actl', 'commit', ...this.args]);
    }
}
CommitCommand.paths = [['commit']];
export { CommitCommand };
