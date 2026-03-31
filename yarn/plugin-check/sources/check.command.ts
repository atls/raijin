import { BaseCommand } from '@yarnpkg/cli'

export class CheckCommand extends BaseCommand {
  static paths = [['check']]

  async execute(): Promise<void> {
    await this.cli.run(['format'])
    await this.cli.run(['typecheck'])
    await this.cli.run(['lint'])
  }
}
