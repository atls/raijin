import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'

class AppServiceBuildCommand extends BaseCommand {
  static paths = [['app', 'service', 'build']]

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { project } = await Project.find(configuration, this.context.cwd)

    await this.cli.run(['actl', 'service', 'build', '--source', this.context.cwd], {
      cwd: project.cwd,
    })
  }
}

export { AppServiceBuildCommand }
