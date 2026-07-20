import { BaseCommand }              from '@yarnpkg/cli'
import { StreamReport }             from '@yarnpkg/core'
import { Option }                   from 'clipanion'

import { getStreamReportCallback }  from '@atls/code-schematics'
import { getStreamReportOptions }   from '@atls/code-schematics'
import { resolveProjectInvocation } from '@atls/raijin/commands'
import { toNativeCwd }              from '@atls/raijin/commands'

export const createGenerateProjectOptions = (type: string, invocationCwd: string) => ({
  type,
  cwd: invocationCwd,
})

export class GenerateProjectCommand extends BaseCommand {
  static override paths = [['generate', 'project']]

  static override usage = BaseCommand.Usage({
    description: 'generate a Raijin project scaffold',
  })

  type = Option.String('-t,--type', 'project')

  async execute() {
    const { invocationCwd, yarn } = await resolveProjectInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const { configuration } = yarn

    const allowedTypes = ['library', 'project']

    if (!allowedTypes.includes(this.type)) {
      throw new Error(`Allowed only ${allowedTypes.join(', ')} types`)
    }

    const options = createGenerateProjectOptions(this.type, toNativeCwd(invocationCwd))

    const streamReportOptions = getStreamReportOptions(this, configuration)
    const streamReportCallback = await getStreamReportCallback(options)

    const commandReport = await StreamReport.start(streamReportOptions, streamReportCallback)

    return commandReport.exitCode()
  }
}
