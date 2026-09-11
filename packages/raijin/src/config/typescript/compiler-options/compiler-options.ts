import type ts                                          from 'typescript'

import type { ResolveTypeScriptCompilerOptionsOptions } from './compiler-options.interfaces.js'

import { dirname }                                      from 'node:path'

const compilerOptionsByConfigPath = new Map<string, ts.CompilerOptions>()

export const resolveTypeScriptCompilerOptions = ({
  filepath,
  typescript,
}: ResolveTypeScriptCompilerOptionsOptions): ts.CompilerOptions => {
  const configPath = typescript.findConfigFile(
    dirname(filepath),
    typescript.sys.fileExists,
    'tsconfig.json'
  )

  if (!configPath) {
    return {}
  }

  const cached = compilerOptionsByConfigPath.get(configPath)

  if (cached) {
    return cached
  }

  const configFile = typescript.readConfigFile(configPath, typescript.sys.readFile)

  if (configFile.error) {
    return {}
  }

  const { options } = typescript.parseJsonConfigFileContent(
    configFile.config,
    typescript.sys,
    dirname(configPath)
  )

  compilerOptionsByConfigPath.set(configPath, options)

  return options
}
