import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'

class AppServiceDevCommand extends BaseCommand {
  static paths = [['app', 'service', 'dev']]

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { project } = await Project.find(configuration, this.context.cwd)

    await this.cli.run(['actl', 'service', 'dev', '--pretty-logs', '--source', this.context.cwd], {
      cwd: project.cwd,
    })
  }
}

export { AppServiceDevCommand }
