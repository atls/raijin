import type { ProjectCommandContext }       from '@atls/raijin/commands'
import type { ProjectInvocation }           from '@atls/raijin/commands'

import { BaseCommand }                      from '@yarnpkg/cli'
import { Option }                           from 'clipanion'

import { generateProject }                  from '@atls/raijin/application/generation/project'
import { createInstalledProjectScaffolder } from '@atls/raijin/infrastructure/generation/project'

import { presentProjectGeneration }         from '../presenters/project.js'

export const createProjectScaffolderOptions = ({ invocationCwd, yarn }: ProjectInvocation) => ({
  configuration: yarn.configuration,
  project: yarn.project,
  targetCwd: invocationCwd,
  workspace: yarn.project.getWorkspaceByFilePath(invocationCwd),
})

export class GenerateProjectCommand extends BaseCommand {
  static override paths = [['generate', 'project']]

  static override usage = BaseCommand.Usage({
    description: 'generate a Raijin project scaffold',
  })

  type = Option.String('-t,--type', 'project')

  declare context: ProjectCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const scaffolder = createInstalledProjectScaffolder(createProjectScaffolderOptions(invocation))
    const result = await generateProject({ scaffoldType: this.type }, { scaffolder })

    return presentProjectGeneration(this.context, invocation.yarn.configuration, result)
  }
}
