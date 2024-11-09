/* eslint-disable n/no-sync */

import type { ResolveFnOutput } from 'node:module'
import type { ResolveHook }     from 'node:module'

import { existsSync }           from 'node:fs'
import { dirname }              from 'node:path'
import { join }                 from 'node:path'
import { extname }              from 'node:path'
import { fileURLToPath }        from 'node:url'

const mapping = new Map([
  ['.js', ['.js', '.ts', '.tsx', '.jsx']],
  ['.cjs', ['.cjs', '.cts']],
  ['.mjs', ['.mjs', '.mts']],
  ['.jsx', ['.jsx', '.tsx']],
])

export const resolve: ResolveHook = (
  specifier,
  context,
  next
): Promise<ResolveFnOutput> | ResolveFnOutput => {
  if (!specifier.startsWith('.')) {
    return next(specifier, context)
  }

  const { parentURL } = context
  if (!parentURL?.startsWith('file:')) {
    return next(specifier, context)
  }

  const specifiedExtension = extname(specifier)
  const sourceExtensions = mapping.get(specifiedExtension)
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
