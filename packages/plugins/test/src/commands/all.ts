import { AbstractTestCommand } from './base.js'

export class TestCommand extends AbstractTestCommand {
  static override paths = [['test']]

  static override usage = AbstractTestCommand.Usage({
    description: 'run all workspace tests',
  })

  override async execute(): Promise<number> {
    return this.executeScenario('general', this.context.invocation)
  }
}
