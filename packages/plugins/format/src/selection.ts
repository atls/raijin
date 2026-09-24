import type { CommandInput }                    from '@atls/raijin/commands'

import { readFile }                             from 'node:fs/promises'
import { stat }                                 from 'node:fs/promises'
import { join }                                 from 'node:path'
import { relative }                             from 'node:path'
import { resolve }                              from 'node:path'
import { sep }                                  from 'node:path'

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

type GitIgnore = ReturnType<typeof ignorer.default>

type ScopedGitIgnore = { directory: string; matcher: GitIgnore }

const readGitIgnore = async (directory: string): Promise<GitIgnore | undefined> => {
  try {
    return ignorer.default().add(await readFile(join(directory, '.gitignore'), 'utf8'))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

const matchesGitIgnore = (
  path: string,
  scopedIgnores: Array<ScopedGitIgnore>,
  directory = false
): boolean =>
  scopedIgnores.reduce((ignored, { directory: ignoreDirectory, matcher }) => {
    const candidate = `${relative(ignoreDirectory, path).split(sep).join('/')}${directory ? '/' : ''}`
    const result = matcher.test(candidate)

    if (result.ignored) return true
    if (result.unignored) return false

    return ignored
  }, false)

const createGitIgnoreSelector = (cwd: string) => {
  const cache = new Map<string, Promise<GitIgnore | undefined>>()

  const getGitIgnore = async (directory: string): Promise<GitIgnore | undefined> => {
    if (!cache.has(directory)) cache.set(directory, readGitIgnore(directory))

    return cache.get(directory)!
  }

  return async (path: string): Promise<boolean> => {
    const parts = relative(cwd, path).split(sep)

    if (parts[0] === '..') return false

    const scopedIgnores: Array<ScopedGitIgnore> = []
    const directories = parts
      .slice(0, -1)
      .reduce<Array<string>>((result, part) => [...result, join(result.at(-1)!, part)], [cwd])
    const matchers = await Promise.all(directories.map(getGitIgnore))

    for (const [index, directory] of directories.entries()) {
      if (index > 0 && matchesGitIgnore(directory, scopedIgnores, true)) return true

      const matcher = matchers[index]

      if (matcher) scopedIgnores.push({ directory, matcher })
    }

    return matchesGitIgnore(path, scopedIgnores)
  }
}

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
  const isGitIgnored = createGitIgnoreSelector(cwd)
  const selected = await Promise.all(
    paths.map(async (file) => ({ file, ignored: await isGitIgnored(resolve(cwd, file)) }))
  )
  const selectedPaths = selected.filter(({ ignored }) => !ignored).map(({ file }) => file)

  return selectedPaths.map((file) => ({ file, path: resolve(cwd, file) }))
}
