/* eslint-disable n/no-sync */

import type * as TypeScript        from 'typescript'
import type { LoadHook }           from 'node:module'
import type { ResolveHook }        from 'node:module'
import type { ResolveHookContext } from 'node:module'
import type { ResolveFnOutput }    from 'node:module'

import { existsSync }              from 'node:fs'
import { readFileSync }            from 'node:fs'
import { readFile }                from 'node:fs/promises'
import { createRequire }           from 'node:module'
import { dirname }                 from 'node:path'
import { extname }                 from 'node:path'
import { join }                    from 'node:path'
import { fileURLToPath }           from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript') as typeof TypeScript

const compilerOptionsByConfigPath = new Map<string, TypeScript.CompilerOptions>()

const sourceExtensionsBySpecifier = new Map([
  ['.js', ['.js', '.ts', '.tsx', '.jsx']],
  ['.mjs', ['.mjs', '.mts']],
  ['.jsx', ['.jsx', '.tsx']],
  ['.css', ['.css.ts', '.css.tsx', '.css.js', '.css.mjs', '.css.mts', '.css']],
])

const typescriptExtensions = new Set(['.ts', '.tsx', '.mts'])

type NextResolve = (
  specifier: string,
  context?: ResolveHookContext
) => Promise<ResolveFnOutput> | ResolveFnOutput

const resolveSourceSpecifier = async (
  context: ResolveHookContext,
  next: NextResolve,
  candidates: Array<string>
): Promise<ResolveFnOutput | undefined> => {
  const [candidate, ...nextCandidates] = candidates

  if (!candidate) {
    return undefined
  }

  try {
    return await next(candidate, context)
  } catch {
    return resolveSourceSpecifier(context, next, nextCandidates)
  }
}

const findPackageType = (filepath: string): string | undefined => {
  let current = dirname(filepath)

  while (current !== dirname(current)) {
    const packagePath = join(current, 'package.json')

    if (existsSync(packagePath)) {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as { type?: string }

      return pkg.type
    }

    current = dirname(current)
  }

  return undefined
}

export const isPnpPackageSource = (filepath: string): boolean => {
  const normalized = filepath.replaceAll('\\', '/')

  return normalized.includes('/.yarn/') && normalized.includes('/node_modules/')
}

const getFormat = (filepath: string): 'module' | null => {
  const ext = extname(filepath)

  switch (ext) {
    case '.mts': {
      return 'module'
    }
    case '.ts':
    case '.tsx': {
      if (findPackageType(filepath) === 'module' || isPnpPackageSource(filepath)) {
        return 'module'
      }

      throw new Error(
        `Raijin TypeScript loader supports only ESM TypeScript sources with package.json type=module`
      )
    }
    default: {
      return null
    }
  }
}

const readCompilerOptions = (filepath: string): TypeScript.CompilerOptions => {
  const configPath = ts.findConfigFile(dirname(filepath), ts.sys.fileExists, 'tsconfig.json')

  if (!configPath) {
    return {}
  }

  const cached = compilerOptionsByConfigPath.get(configPath)
  if (cached) {
    return cached
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    return {}
  }

  const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(configPath))

  compilerOptionsByConfigPath.set(configPath, options)

  return options
}

const getCompilerOptions = (filepath: string, _format: 'module'): TypeScript.CompilerOptions => {
  const options = readCompilerOptions(filepath)

  return {
    ...options,
    esModuleInterop: true,
    inlineSourceMap: true,
    jsx: options.jsx ?? ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    sourceMap: false,
    target: options.target ?? ts.ScriptTarget.ES2022,
  }
}

const transformSource = (source: string, filepath: string, format: 'module'): string => {
  const { outputText } = ts.transpileModule(source, {
    fileName: filepath,
    compilerOptions: getCompilerOptions(filepath, format),
  })

  return outputText
}

export const resolve: ResolveHook = async (specifier, context, next) => {
  if (!specifier.startsWith('.')) {
    return next(specifier, context)
  }

  const { parentURL } = context
  if (!parentURL?.startsWith('file:')) {
    return next(specifier, context)
  }

  const specifiedExtension = extname(specifier)
  const sourceExtensions = sourceExtensionsBySpecifier.get(specifiedExtension)
  if (!sourceExtensions) {
    return next(specifier, context)
  }

  const location = dirname(fileURLToPath(parentURL))
  const required = specifier.slice(0, -specifiedExtension.length)
  const path = join(location, required)
  const existingSpecifiers: Array<string> = []
  const virtualSpecifiers: Array<string> = []

  for (const sourceExtension of sourceExtensions) {
    const sourceSpecifier = required + sourceExtension

    if (existsSync(path + sourceExtension)) {
      existingSpecifiers.push(sourceSpecifier)
    } else if (sourceExtension !== specifiedExtension) {
      virtualSpecifiers.push(sourceSpecifier)
    }
  }

  const resolved = await resolveSourceSpecifier(context, next, [
    ...existingSpecifiers,
    ...virtualSpecifiers,
  ])

  if (resolved) {
    return resolved
  }

  return next(specifier, context)
}

export const load: LoadHook = async (urlString, context, next) => {
  const url = new URL(urlString)

  if (url.protocol !== 'file:') {
    return next(urlString, context)
  }

  const filepath = fileURLToPath(url)

  if (!typescriptExtensions.has(extname(filepath))) {
    return next(urlString, context)
  }

  const format = getFormat(filepath)

  if (!format) {
    return next(urlString, context)
  }

  const source = await readFile(filepath, 'utf8')

  return {
    format,
    shortCircuit: true,
    source: transformSource(source, filepath, format),
  }
}
