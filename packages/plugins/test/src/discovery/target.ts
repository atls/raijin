import type { CommandTarget }      from '@atls/raijin/commands'

import type { ExistingTargetPath } from './interfaces/target.js'
import type { MissingTargetPath }  from './interfaces/target.js'
import type { TargetPathResult }   from './interfaces/target.js'

import { stat }                    from 'node:fs/promises'
import { resolve }                 from 'node:path'

import { toNativePath }            from '@atls/raijin/filesystem'

import { isMissingPathError }      from './missing-path.js'

const isExistingTargetPath = (result: TargetPathResult): result is ExistingTargetPath =>
  'stat' in result

export const isFilenameTarget = (pattern: string): boolean => {
  const hasPathSeparator = pattern.includes('/') || pattern.includes('\\')
  const hasValidExtension = /\.(js|jsx|ts|tsx)$/.test(pattern)

  return !hasPathSeparator && !hasValidExtension
}

export const isGlobTarget = (pattern: string): boolean => /[*?[\]{}]/.test(pattern)

export const findExistingTargetPath = async (
  target: CommandTarget,
  rootCwd: string
): Promise<ExistingTargetPath> => {
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

  for (const targetResult of targetResults) {
    if ('error' in targetResult) {
      throw targetResult.error
    }
  }

  throw new Error(`Test target does not exist: ${target.request}`)
}
