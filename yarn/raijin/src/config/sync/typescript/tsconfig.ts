import type { PortablePath }                from '@yarnpkg/fslib'

import type { TypeScriptConfigShape }       from '../../typescript/config.interfaces.js'
import type { SyncTypeScriptConfigOptions } from './tsconfig.interfaces.js'

import assert                               from 'node:assert'

import { ppath }                            from '@yarnpkg/fslib'
import { xfs }                              from '@yarnpkg/fslib'

import { typescriptDefaults }               from '../../typescript/index.js'
import { mergeTypeScriptCompilerOptions }   from '../../typescript/index.js'

const PROJECT_TYPES_INCLUDE = 'project.types.d.ts'
const IMPLICIT_INCLUDE = '**/*'

export const projectTypesReference = '/// <reference types="@atls/raijin/types" />\n'

const toWorkspaceInclude = (workspacePattern: string): string => {
  if (workspacePattern.endsWith('/**/*')) {
    return workspacePattern
  }

  if (workspacePattern.endsWith('/*')) {
    return workspacePattern.replace('/*', '/**/*')
  }

  return workspacePattern
}

const hasEntry = (config: TypeScriptConfigShape, key: string): boolean => Object.hasOwn(config, key)

export const resolveTypeScriptIncludes = (
  config: TypeScriptConfigShape,
  workspaceIncludes: ReadonlyArray<string>
): Array<string> | undefined => {
  const existingIncludes: Array<string> = (() => {
    if (Array.isArray(config.include)) {
      return config.include.filter((item): item is string => typeof item === 'string')
    }

    if (!hasEntry(config, 'include')) {
      if (hasEntry(config, 'files') || hasEntry(config, 'extends')) {
        return []
      }

      return [IMPLICIT_INCLUDE]
    }

    return []
  })()

  if (existingIncludes.length === 0 && !hasEntry(config, 'include')) {
    return undefined
  }

  return Array.from(new Set([PROJECT_TYPES_INCLUDE, ...existingIncludes, ...workspaceIncludes]))
}

export const syncTypeScriptConfig = async ({
  cwd,
  workspacePatterns,
}: SyncTypeScriptConfigOptions): Promise<boolean> => {
  const configPath = ppath.join(cwd, 'tsconfig.json' as PortablePath)
  const existing: TypeScriptConfigShape = (await xfs.existsPromise(configPath))
    ? await xfs.readJsonPromise(configPath)
    : { compilerOptions: {} }
  const config = {
    ...existing,
    compilerOptions: mergeTypeScriptCompilerOptions(
      typescriptDefaults.compilerOptions,
      existing.compilerOptions
    ),
  }
  const include = resolveTypeScriptIncludes(config, workspacePatterns.map(toWorkspaceInclude))
  const next = {
    ...config,
    ...(include ? { include } : {}),
  }

  await xfs.writeFilePromise(
    ppath.join(cwd, PROJECT_TYPES_INCLUDE as PortablePath),
    projectTypesReference
  )

  try {
    assert.deepEqual(existing, next)

    return false
  } catch {
    await xfs.writeJsonPromise(configPath, next)

    return true
  }
}
