import type { CommandTarget }      from '@atls/raijin/commands'

import type { ExistingTargetPath } from './interfaces/target.js'
import type { MissingTargetPath }  from './interfaces/target.js'
import type { TargetPathResult }   from './interfaces/target.js'

import { stat }                    from 'node:fs/promises'
import { resolve }                 from 'node:path'

import { toNativePath }            from '@atls/raijin/filesystem'

const isExistingTargetPath = (result: TargetPathResult): result is ExistingTargetPath =>
  'stat' in result

const isMissingPathError = (error: unknown): boolean =>
  !!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')

export const findExistingTargetPath = async (
  target: CommandTarget,
  rootCwd: string
): Promise<ExistingTargetPath | undefined> => {
  const cwdTargetPath = toNativePath(target.path)
  const rootTargetPath = resolve(rootCwd, target.request)
  const targetPaths =
    cwdTargetPath === rootTargetPath ? [cwdTargetPath] : [cwdTargetPath, rootTargetPath]
  const targetResults = await Promise.all(
    targetPaths.map(async (targetPath): Promise<TargetPathResult> => {
      try {
        return {
          path: targetPath,
          stat: await stat(targetPath),
        }
      } catch (error) {
        return { error }
      }
    })
  )
  const existingTarget = targetResults.find(isExistingTargetPath)

  if (existingTarget) {
    return existingTarget
  }

  const unexpectedTarget = targetResults.find(
    (result): result is MissingTargetPath => 'error' in result && !isMissingPathError(result.error)
  )

  if (unexpectedTarget) {
    throw unexpectedTarget.error
  }

  return undefined
}
