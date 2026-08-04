import type { ProjectInvocation }  from '@atls/raijin/commands'

import { StreamReport }            from '@yarnpkg/core'
import { Option }                  from 'clipanion'

import { RaijinCommand }           from '@atls/raijin/commands'
import { getStreamReportCallback } from '@atls/code-schematics'
import { getStreamReportOptions }  from '@atls/code-schematics'
import { toNativeCwd }             from '@atls/raijin/commands'

export const createGenerateProjectOptions = (type: string, invocationCwd: string) => ({
  type,
  cwd: invocationCwd,
})

export class GenerateProjectCommand extends RaijinCommand {
  static override paths = [['generate', 'project']]

  static override usage = RaijinCommand.Usage({
    description: 'generate a Raijin project scaffold',
  })

  type = Option.String('-t,--type', 'project')

  async executeProject(invocation: ProjectInvocation): Promise<number> {
    const { invocationCwd, yarn } = invocation
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
