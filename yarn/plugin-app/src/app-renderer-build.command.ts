import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { Option }        from 'clipanion'

class AppRendererBuildCommand extends BaseCommand {
  static paths = [['app', 'renderer', 'build']]

  export = Option.Boolean('-e,--export', false)

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { project } = await Project.find(configuration, this.context.cwd)

    const input = ['actl', 'renderer', 'build', '--source', this.context.cwd]

    if (this.export) {
      input.push('--export')
    }

    await this.cli.run(input, {
      cwd: project.cwd,
    })
  }
}

export { AppRendererBuildCommand }
