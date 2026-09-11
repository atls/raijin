import type { ProjectCommandContext } from '../definition.interfaces.js'

import { BaseCommand }                from '@yarnpkg/cli'

export class BypassedProjectCommand extends BaseCommand {
  static override paths = [['bypassed-project']]

  declare context: ProjectCommandContext

  executeBeforeInvocation(): number {
    return 9
  }

  override execute(): never {
    throw new Error('Project invocation should not be resolved after an early exit.')
  }
}
