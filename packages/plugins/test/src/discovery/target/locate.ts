import type { CommandTarget }    from '@atls/raijin/commands'

import type { ExistingLocation } from './probe.js'

import { resolve }               from 'node:path'

import { toNativePath }          from '@atls/raijin/filesystem'

import { isExistingLocation }    from './probe.js'
import { isUnexpectedFailure }   from './probe.js'
import { probePath }             from './probe.js'

export const locateExisting = async (
  target: CommandTarget,
  rootCwd: string
): Promise<ExistingLocation | undefined> => {
  const cwdTargetPath = toNativePath(target.path)
  const rootTargetPath = resolve(rootCwd, target.request)
  const targetPaths =
    cwdTargetPath === rootTargetPath ? [cwdTargetPath] : [cwdTargetPath, rootTargetPath]
  const targetResults = await Promise.all(targetPaths.map(probePath))
  const existingTarget = targetResults.find(isExistingLocation)

  if (existingTarget) {
    return existingTarget
  }

  const unexpectedTarget = targetResults.find(isUnexpectedFailure)

  if (unexpectedTarget && 'error' in unexpectedTarget) {
    throw unexpectedTarget.error
  }

  return undefined
}
