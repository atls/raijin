/* eslint-disable n/no-sync */

import type * as TypeScript from 'typescript'
import type { ResolveHook } from 'node:module'
import type { LoadHook }    from 'node:module'

import { existsSync }       from 'node:fs'
import { readFileSync }     from 'node:fs'
import { readFile }         from 'node:fs/promises'
import { createRequire }    from 'node:module'
import { dirname }          from 'node:path'
import { extname }          from 'node:path'
import { join }             from 'node:path'
import { fileURLToPath }    from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript') as typeof TypeScript

const sourceExtensionsBySpecifier = new Map([
  ['.js', ['.js', '.ts', '.tsx', '.jsx']],
  ['.mjs', ['.mjs', '.mts']],
  ['.cjs', ['.cjs', '.cts']],
  ['.jsx', ['.jsx', '.tsx']],
  [
    '.css',
    ['.css.ts', '.css.tsx', '.css.js', '.css.mjs', '.css.mts', '.css.cjs', '.css.cts', '.css'],
  ],
])

const typescriptExtensions = new Set(['.ts', '.tsx', '.mts', '.cts'])

const findPackageType = (filepath: string): string => {
  let current = dirname(filepath)

  while (current !== dirname(current)) {
    const packagePath = join(current, 'package.json')

    if (existsSync(packagePath)) {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as { type?: string }

      return pkg.type ?? 'commonjs'
    }

    current = dirname(current)
  }

  return 'commonjs'
}

const getFormat = (filepath: string): 'commonjs' | 'module' | null => {
  const ext = extname(filepath)

  switch (ext) {
    case '.mts': {
      return 'module'
    }
    case '.cts': {
      return 'commonjs'
    }
    case '.ts':
    case '.tsx': {
      return findPackageType(filepath) === 'module' ? 'module' : 'commonjs'
    }
    default: {
      return null
    }
  }
}

const getModuleKind = (format: 'commonjs' | 'module'): TypeScript.ModuleKind =>
  format === 'module' ? ts.ModuleKind.ESNext : ts.ModuleKind.CommonJS

const transformSource = (
  source: string,
  filepath: string,
  format: 'commonjs' | 'module'
): string => {
  const { outputText } = ts.transpileModule(source, {
    fileName: filepath,
    compilerOptions: {
      esModuleInterop: true,
      inlineSourceMap: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: getModuleKind(format),
      target: ts.ScriptTarget.ES2022,
    },
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

  for (const sourceExtension of sourceExtensions) {
    if (existsSync(path + sourceExtension)) {
      return next(required + sourceExtension, context)
    }
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
