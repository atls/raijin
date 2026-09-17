import type { CommandInput }  from '@atls/raijin/commands'
import type { CommandTarget } from '@atls/raijin/commands'
import type { Project }       from '@yarnpkg/core'
import type { Workspace }     from '@yarnpkg/core'

import { stat }               from 'node:fs/promises'

import { UsageError }         from 'clipanion'

import { toNativePath }       from '@atls/raijin/filesystem'

export type TargetGroup = {
  readonly workspace: Workspace
  readonly input: CommandInput
  readonly directories: CommandInput
  readonly files: CommandInput
}

export const selectTargetGroups = async (
  project: Project,
  input: CommandInput
): Promise<ReadonlyArray<TargetGroup>> => {
  const selected = new Map<
    Workspace,
    {
      all: Array<CommandTarget>
      directories: Array<CommandTarget>
      files: Array<CommandTarget>
    }
  >()

  for await (const target of input.targets) {
    const workspace = project.tryWorkspaceByFilePath(target.path)

    if (!workspace) {
      throw new UsageError(`Check target is outside the active Yarn project: ${target.request}`)
    }

    const targetStat = await stat(toNativePath(target.path))
    const group = selected.get(workspace) ?? { all: [], directories: [], files: [] }

    if (targetStat.isDirectory()) {
      group.directories.push(target)
    } else if (targetStat.isFile()) {
      group.files.push(target)
    } else {
      throw new UsageError(`Check target is not a file or directory: ${target.request}`)
    }

    group.all.push(target)
    selected.set(workspace, group)
  }

  return [...selected].map(([workspace, group]) => ({
    workspace,
    input: { ...input, cwd: workspace.cwd, targets: group.all },
    directories: { ...input, cwd: workspace.cwd, targets: group.directories },
    files: { ...input, cwd: workspace.cwd, targets: group.files },
  }))
}
