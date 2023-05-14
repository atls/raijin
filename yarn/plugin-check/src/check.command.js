import { BaseCommand } from '@yarnpkg/cli';
class CheckCommand extends BaseCommand {
    async execute() {
        await this.cli.run(['format']);
        await this.cli.run(['typecheck']);
        await this.cli.run(['lint']);
    }
}
CheckCommand.paths = [['check']];
export { CheckCommand };
