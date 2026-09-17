import type { Project }              from '@yarnpkg/core'

import { scriptUtils }               from '@yarnpkg/core'
import { structUtils }               from '@yarnpkg/core'

import { shouldSkipRepositoryHooks } from '@atls/raijin/installation/hooks/skip'

const HOOKS_BINARY = 'raijin-hooks'
const RAIJIN_IDENT_HASH = structUtils.makeIdent('atls', 'raijin').identHash

export const afterAllInstalled = async (project: Project): Promise<void> => {
  if (shouldSkipRepositoryHooks()) return

  const packages = [...project.storedPackages.values()].filter(
    (candidate) => candidate.identHash === RAIJIN_IDENT_HASH
  )

  if (packages.length === 0) return
  if (packages.length !== 1) throw new Error('Multiple installed @atls/raijin packages')

  const status = await scriptUtils.executePackageAccessibleBinary(packages[0], HOOKS_BINARY, [], {
    cwd: project.cwd,
    project,
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  })

  if (status !== 0) throw new Error(`Raijin hook installation failed with exit code ${status}`)
}
