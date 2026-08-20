import type { CommandInput }                    from '@atls/raijin/commands'

import { stat }                                 from 'node:fs/promises'
import { relative }                             from 'node:path'
import { resolve }                              from 'node:path'

import ignorer                                  from 'ignore'

import { resolvePrettierProjectIgnorePatterns } from '@atls/raijin/config/prettier'
import { discoverFiles }                        from '@atls/raijin/filesystem'
import { toNativePath }                         from '@atls/raijin/filesystem'
import { toPortablePath }                       from '@atls/raijin/filesystem'

import { TargetMissingException }               from './exceptions/target-missing.js'

const ignoredPaths = [
  '.c9',
  '.pnp.js',
  '.pnp.cjs',
  '.pnp.loader.mjs',
  '.git',
  'node_modules',
  'coverage',
  'dist',
  '.yarn',
  '.vscode',
  '.next',
  '**/**/dist/*',
  '**/**/templates/*.yaml',
  '**/templates/*.yaml',
  '.terraform',
  '.idea',
]

const sourcePatterns = ['**/*.{js,mjs,cjs,ts,tsx,yml,yaml,json,graphql,md,mdx}']

const discoveryIgnores = ['**/node_modules/**', '**/.{git,svn,hg}/**', '**/.yarn/**', '**/.idea/**']

const selectTarget = async (target: CommandInput['targets'][number]): Promise<Array<string>> => {
  const targetPath = toNativePath(target.path)
  let targetStat

  try {
    targetStat = await stat(targetPath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new TargetMissingException(target.request)
    }

    throw error
  }

  if (!targetStat.isDirectory()) {
    return [targetPath]
  }

  return (
    await discoverFiles({
      cwd: target.path,
      dot: true,
      ignore: discoveryIgnores,
      patterns: sourcePatterns,
    })
  ).map(toNativePath)
}

const selectExplicitTargets = async (input: CommandInput): Promise<Array<string>> => {
  const targets: Array<string> = []

  await input.targets.reduce<Promise<void>>(async (previous, target) => {
    await previous

    targets.push(...(await selectTarget(target)))
  }, Promise.resolve())

  return targets
}

const selectProjectTargets = async (cwd: string): Promise<Array<string>> =>
  (
    await discoverFiles({
      cwd: toPortablePath(cwd),
      dot: true,
      ignore: discoveryIgnores,
      patterns: sourcePatterns,
    })
  ).map(toNativePath)

export const selectFiles = async (
  cwd: string,
  input?: CommandInput
): Promise<Array<{ file: string; path: string }>> => {
  const targets = Array.from(
    new Set(input ? await selectExplicitTargets(input) : await selectProjectTargets(cwd))
  )
  const paths = ignorer
    .default()
    .add(ignoredPaths)
    .add(await resolvePrettierProjectIgnorePatterns(cwd))
    .filter(targets.map((path) => relative(cwd, path)))

  return paths.map((file) => ({ file, path: resolve(cwd, file) }))
}
