import { BaseCommand }              from '@yarnpkg/cli'
import { Option }                   from 'clipanion'

import { createCommandInput }       from '@atls/raijin/commands/input'
import { resolveProjectInvocation } from '@atls/raijin/commands/invocation'

import { SCAFFOLD_TYPES }           from './scaffold.js'
import { isScaffoldType }           from './scaffold.js'
import { generateProject }          from './workflow.js'

export class GenerateProjectCommand extends BaseCommand {
  static override paths = [['generate', 'project']]

  type = Option.String('-t,--type', 'project')

  override async execute(): Promise<number> {
    const invocation = await resolveProjectInvocation(this.context.cwd, this.context.plugins)

    if (!isScaffoldType(this.type)) {
      throw new Error(`Allowed only ${SCAFFOLD_TYPES.join(', ')} types`)
    }

    return generateProject({
      input: createCommandInput({
        cwd: invocation.invocationCwd,
        source: 'explicit',
        targets: ['.'],
      }),
      project: invocation.project,
      type: this.type,
    })
  }
}
