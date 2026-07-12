import { BaseCommand }                     from '@yarnpkg/cli'
import { StreamReport }                    from '@yarnpkg/core'
import { Option }                          from 'clipanion'

import { getStreamReportCallback }         from '@atls/code-schematics'
import { getStreamReportOptions }          from '@atls/code-schematics'
import { resolveProjectCommandInvocation } from '@atls/raijin/commands'

export const createGenerateProjectOptions = (type: string, invocationCwd: string) => ({
  type,
  cwd: invocationCwd,
})

export class GenerateProjectCommand extends BaseCommand {
  static override paths = [['generate', 'project']]

  type = Option.String('-t,--type', 'project')

  async execute() {
    const { configuration, invocationCwd } = await resolveProjectCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )

    const allowedTypes = ['library', 'project']

    if (!allowedTypes.includes(this.type)) {
      throw new Error(`Allowed only ${allowedTypes.join(', ')} types`)
    }

    const options = createGenerateProjectOptions(this.type, invocationCwd)

    const streamReportOptions = getStreamReportOptions(this, configuration)
    const streamReportCallback = await getStreamReportCallback(options)

    const commandReport = await StreamReport.start(streamReportOptions, streamReportCallback)

    return commandReport.exitCode()
  }
}
