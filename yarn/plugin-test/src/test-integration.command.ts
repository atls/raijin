import { BaseCommand }  from '@yarnpkg/cli'
import { PortablePath } from '@yarnpkg/fslib'
import { Option }       from 'clipanion'

class TestIntegrationCommand extends BaseCommand {
  static paths = [['test', 'integration']]

  args: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    const cwd = this.cwd || process.cwd()
    const isWorkspace = this.context.cwd !== cwd

    const args = ['actl', 'test:integration']

    if (isWorkspace) {
      const scope = this.context.cwd.replace(cwd, '')

      args.push(scope.startsWith('/') ? scope.substr(1) : scope)
    }

    await this.cli.run(args.concat(this.args), {
      cwd: isWorkspace ? (cwd as PortablePath) : this.context.cwd,
    })
  }
}

export { TestIntegrationCommand }
