import type { Project }              from '@yarnpkg/core'

import { scriptUtils }               from '@yarnpkg/core'

import { shouldSkipRepositoryHooks } from '@atls/raijin/installation/hooks/skip'

const HOOKS_BINARY = 'raijin-hooks'

export const afterAllInstalled = async (project: Project): Promise<void> => {
  if (shouldSkipRepositoryHooks()) return

  const status = await scriptUtils.executeWorkspaceAccessibleBinary(
    project.topLevelWorkspace,
    HOOKS_BINARY,
    [],
    {
      cwd: project.cwd,
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    }
  )

  if (status !== 0) throw new Error(`Raijin hook installation failed with exit code ${status}`)
}
