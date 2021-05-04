import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { Command }       from 'clipanion'

class AppRendererBuildCommand extends BaseCommand {
  @Command.Boolean('-e,--export')
  export: boolean = false

  @Command.Path('app', 'renderer', 'build')
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
