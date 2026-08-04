import type { ProjectInvocation }  from '@atls/raijin/commands'

import { BaseCommand }             from '@yarnpkg/cli'
import { StreamReport }            from '@yarnpkg/core'
import { Option }                  from 'clipanion'

import { getStreamReportCallback } from '@atls/code-schematics'
import { getStreamReportOptions }  from '@atls/code-schematics'
import { defineCommandInvocation } from '@atls/raijin/commands'
import { toNativeCwd }             from '@atls/raijin/commands'

export const createGenerateProjectOptions = (type: string, invocationCwd: string) => ({
  type,
  cwd: invocationCwd,
})

export class GenerateProjectCommand extends BaseCommand {
  static override paths = [['generate', 'project']]

  static raijinCommand = defineCommandInvocation({ scope: 'project' })

  static override usage = BaseCommand.Usage({
    description: 'generate a Raijin project scaffold',
  })

  type = Option.String('-t,--type', 'project')

  override async execute(invocation?: ProjectInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

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
