import type { Diagnostic }                      from 'typescript'
import type { ParseConfigFileHost }             from 'typescript'

import type { TypeScriptPackageManifest }       from './project.interfaces.js'
import type { TypeScriptProjectConfig }         from './project.interfaces.js'
import type { ResolveTypeScriptProjectOptions } from './project.interfaces.js'

import { readFile }                             from 'node:fs/promises'
import { dirname }                              from 'node:path'
import { join }                                 from 'node:path'

import defaults                                 from '../defaults.js'

const PROJECT_CONFIG = 'tsconfig.json'
const PACKAGE_MANIFEST = 'package.json'

const readManifest = async (cwd: string): Promise<TypeScriptPackageManifest> => {
  const content = await readFile(join(cwd, PACKAGE_MANIFEST), 'utf8')

  return JSON.parse(content) as TypeScriptPackageManifest
}

const resolveSkipLibCheck = (
  manifests: ReadonlyArray<TypeScriptPackageManifest>,
  projectSkipLibCheck: boolean | undefined
): boolean => {
  const manifest = [...manifests]
    .reverse()
    .find((item) => Object.hasOwn(item, 'typecheckSkipLibCheck'))

  if (manifest) {
    return manifest.typecheckSkipLibCheck!
  }

  if (projectSkipLibCheck !== undefined) {
    return projectSkipLibCheck
  }

  return false
}

const createParseHost = (
  excludes: ReadonlyArray<string>,
  diagnostics: Array<Diagnostic>,
  typescript: ResolveTypeScriptProjectOptions['typescript']
): ParseConfigFileHost => ({
  ...typescript.sys,
  onUnRecoverableConfigFileDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
  readDirectory: (rootDir, extensions, projectExcludes, includes, depth) =>
    typescript.sys.readDirectory(
      rootDir,
      extensions,
      Array.from(new Set([...(projectExcludes ?? []), ...excludes])),
      includes,
      depth
    ),
})

export const resolveTypeScriptProject = async ({
  compilerOptions = {},
  cwd,
  manifestCwds = [cwd],
  selection,
  typescript,
}: ResolveTypeScriptProjectOptions): Promise<TypeScriptProjectConfig> => {
  const projectConfigFileName = join(cwd, PROJECT_CONFIG)
  const configFileName = typescript.sys.fileExists(projectConfigFileName)
    ? projectConfigFileName
    : undefined
  const manifests = await Promise.all(Array.from(new Set(manifestCwds)).map(readManifest))
  const projectIgnorePatterns = manifests.flatMap(
    ({ typecheckIgnorePatterns = [] }) => typecheckIgnorePatterns
  )
  const fatalDiagnostics: Array<Diagnostic> = []
  const host = createParseHost(
    [...defaults.exclude, ...projectIgnorePatterns],
    fatalDiagnostics,
    typescript
  )
  const parsed = configFileName
    ? typescript.getParsedCommandLineOfConfigFile(configFileName, compilerOptions, host)
    : typescript.parseJsonConfigFileContent(
        {
          ...defaults,
          ...(selection ? { include: selection.patterns } : {}),
        },
        host,
        cwd,
        compilerOptions
      )

  if (!parsed) {
    return {
      configFileName,
      errors: fatalDiagnostics,
      fileNames: [],
      options: {},
    }
  }

  const explicitSelection = selection?.kind === 'explicit' && configFileName !== undefined
  const selected = explicitSelection
    ? typescript.parseJsonConfigFileContent(
        { include: selection.patterns },
        host,
        dirname(configFileName),
        compilerOptions
      )
    : undefined
  const ignoredProjectErrors = new Set([18002, 18003])
  const convertedDefaults = typescript.convertCompilerOptionsFromJson(defaults.compilerOptions, cwd)

  return {
    configFileName,
    errors: [
      ...fatalDiagnostics,
      ...convertedDefaults.errors,
      ...parsed.errors.filter(({ code }) => !explicitSelection || !ignoredProjectErrors.has(code)),
      ...(selected?.errors ?? []),
    ],
    fileNames: selected?.fileNames ?? parsed.fileNames,
    options: {
      ...convertedDefaults.options,
      ...parsed.options,
      skipLibCheck: resolveSkipLibCheck(manifests, parsed.options.skipLibCheck),
    },
    projectReferences: parsed.projectReferences,
  }
}
