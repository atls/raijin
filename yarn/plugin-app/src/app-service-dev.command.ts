import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { Command }       from 'clipanion'

class AppServiceDevCommand extends BaseCommand {
  @Command.Path('app', 'service', 'dev')
  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { project } = await Project.find(configuration, this.context.cwd)

    await this.cli.run(['actl', 'service', 'dev', '--pretty-logs', '--source', this.context.cwd], {
      cwd: project.cwd,
    })
  }
}

export { AppServiceDevCommand }
