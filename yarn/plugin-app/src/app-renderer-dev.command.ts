import { BaseCommand }          from '@yarnpkg/cli'
import { Configuration }        from '@yarnpkg/core'
import { Project }              from '@yarnpkg/core'
import { Command }              from 'clipanion'

import { ProjectConfiguration } from '@atls/code-configuration'

class AppRendererDevCommand extends BaseCommand {
  @Command.Boolean('-t,--tunnel')
  tunnel: Boolean = false

  @Command.Path('app', 'renderer', 'dev')
  async execute() {
    const { project } = await Project.find(
      await Configuration.find(this.context.cwd, this.context.plugins),
      this.context.cwd
    )

    const input = ['actl', 'renderer', 'dev', '--pretty-logs', '--source', this.context.cwd]

    if (this.tunnel) {
      const { tunnel } = await ProjectConfiguration.find(project.cwd)

      if (tunnel?.host) {
        input.push('--tunnel')
        input.push(tunnel.host)
      }
    }

    await this.cli.run(input, {
      cwd: project.cwd,
    })
  }
}

export { AppRendererDevCommand }