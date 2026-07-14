import type { Diagnostic }                      from 'typescript'

import type { TypeScriptConfigShape }           from '../config.interfaces.js'
import type { TypeScriptProjectConfig }         from './project.interfaces.js'
import type { ResolveTypeScriptProjectOptions } from './project.interfaces.js'

import { readFile }                             from 'node:fs/promises'
import { join }                                 from 'node:path'

import defaults                                 from '../defaults.js'

const PROJECT_CONFIG = 'tsconfig.json'
const PACKAGE_MANIFEST = 'package.json'

type PackageManifestShape = Record<string, unknown> & {
  typecheckIgnorePatterns?: ReadonlyArray<string>
  typecheckSkipLibCheck?: boolean
}

const asCompilerOptions = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const asStringArray = (value: unknown): Array<string> =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const readManifest = async (cwd: string): Promise<PackageManifestShape> => {
  const content = await readFile(join(cwd, PACKAGE_MANIFEST), 'utf8')

  return JSON.parse(content) as PackageManifestShape
}

const resolveSkipLibCheck = (
  manifests: ReadonlyArray<PackageManifestShape>,
  projectCompilerOptions: Record<string, unknown>
): boolean => {
  const manifest = [...manifests]
    .reverse()
    .find((item) => Object.hasOwn(item, 'typecheckSkipLibCheck'))
  const defaultCompilerOptions = asCompilerOptions(defaults.compilerOptions)

  if (manifest) {
    return manifest.typecheckSkipLibCheck!
  }

  if (typeof projectCompilerOptions.skipLibCheck === 'boolean') {
    return projectCompilerOptions.skipLibCheck
  }

  return defaultCompilerOptions.skipLibCheck === true
}

export const resolveTypeScriptProject = async ({
  compilerOptions = {},
  cwd,
  manifestCwds = [cwd],
  selection,
  typescript,
}: ResolveTypeScriptProjectOptions): Promise<TypeScriptProjectConfig> => {
  const configFileName = typescript.findConfigFile(cwd, typescript.sys.fileExists, PROJECT_CONFIG)
  const projectResult: { config: TypeScriptConfigShape; error?: Diagnostic } = (() => {
    if (!configFileName) {
      return { config: {} }
    }

    const result = typescript.readConfigFile(configFileName, typescript.sys.readFile)

    if (result.error) {
      return { config: {}, error: result.error }
    }

    return { config: result.config as TypeScriptConfigShape }
  })()
  const projectConfig = projectResult.config

  if (projectResult.error) {
    return {
      configFileName,
      errors: [projectResult.error],
      fileNames: [],
      options: {},
    }
  }
  const manifests = await Promise.all(Array.from(new Set(manifestCwds)).map(readManifest))
  const projectCompilerOptions = asCompilerOptions(projectConfig.compilerOptions)
  const projectIgnorePatterns = manifests.flatMap(
    ({ typecheckIgnorePatterns = [] }) => typecheckIgnorePatterns
  )
  const projectExcludePatterns = asStringArray(projectConfig.exclude)
  const shouldApplySelection = selection && configFileName === undefined
  const config = {
    ...defaults,
    ...projectConfig,
    compilerOptions: {
      ...defaults.compilerOptions,
      ...projectCompilerOptions,
      ...compilerOptions,
      skipLibCheck: resolveSkipLibCheck(manifests, projectCompilerOptions),
    },
    ...(shouldApplySelection ? { include: selection.patterns } : {}),
    exclude: Array.from(
      new Set([...defaults.exclude, ...projectExcludePatterns, ...projectIgnorePatterns])
    ),
  }
  const parsed = typescript.parseJsonConfigFileContent(
    config,
    typescript.sys,
    cwd,
    undefined,
    configFileName
  )
  const explicitSelection = selection?.kind === 'explicit' && configFileName !== undefined
  const selected = explicitSelection
    ? typescript.parseJsonConfigFileContent(
        {
          compilerOptions: config.compilerOptions,
          exclude: config.exclude,
          include: selection.patterns,
        },
        typescript.sys,
        cwd
      )
    : undefined
  const ignoredProjectErrors = new Set([18002, 18003])

  return {
    configFileName,
    errors: [
      ...parsed.errors.filter(({ code }) => !explicitSelection || !ignoredProjectErrors.has(code)),
      ...(selected?.errors ?? []),
    ],
    fileNames: selected?.fileNames ?? parsed.fileNames,
    options: parsed.options,
    projectReferences: parsed.projectReferences,
  }
}
