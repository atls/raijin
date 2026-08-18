import type { SourceFiles } from '../../../../../application/project/formatting/ports/files.interfaces.js'
import type { SourceTarget } from '../../../../../application/project/formatting/ports/files.interfaces.js'
import type { CommandInput }                    from '../../../../../commands/index.js'

import { readFile }                             from 'node:fs/promises'
import { stat }                                 from 'node:fs/promises'
import { writeFile }                            from 'node:fs/promises'
import { relative }                             from 'node:path'
import { resolve }                              from 'node:path'

import ignorer                                  from 'ignore'

import { resolvePrettierProjectIgnorePatterns } from '../../../../../config/prettier/index.js'
import { discoverFiles }                        from '../../../../../filesystem/index.js'
import { toNativePath }                         from '../../../../../filesystem/index.js'
import { toPortablePath }                       from '../../../../../filesystem/index.js'

const ignore = [
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

const patterns: Array<string> = ['**/*.{js,mjs,cjs,ts,tsx,yml,yaml,json,graphql,md,mdx}']

const ignorePatterns: Array<string> = [
  '**/node_modules/**',
  '**/.{git,svn,hg}/**',
  '**/.yarn/**',
  '**/.idea/**',
]

const resolveTarget = async (target: CommandInput['targets'][number]): Promise<Array<string>> => {
  const targetPath = toNativePath(target.path)
  let targetStat

  try {
    targetStat = await stat(targetPath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Formatter target does not exist: ${target.request}`)
    }

    throw error
  }

  if (targetStat.isDirectory()) {
    return (
      await discoverFiles({
        cwd: target.path,
        patterns,
        ignore: ignorePatterns,
        dot: true,
      })
    ).map(toNativePath)
  }

  return [targetPath]
}

const resolveTargets = async (input: CommandInput): Promise<Array<string>> => {
  const targets: Array<string> = []

  await input.targets.reduce<Promise<void>>(async (previous, target) => {
    await previous

    targets.push(...(await resolveTarget(target)))
  }, Promise.resolve())

  return targets
}

const resolveProjectTargets = async (cwd: string): Promise<Array<string>> =>
  (
    await discoverFiles({
      cwd: toPortablePath(cwd),
      patterns,
      ignore: ignorePatterns,
      dot: true,
    })
  ).map(toNativePath)

export const createSourceFiles = (cwd: string): SourceFiles => ({
  read: async (path) => readFile(path, 'utf8'),
  resolve: async (input): Promise<Array<SourceTarget>> => {
    const targets = Array.from(
      new Set(input ? await resolveTargets(input) : await resolveProjectTargets(cwd))
    )
    const files = ignorer
      .default()
      .add(ignore)
      .add(await resolvePrettierProjectIgnorePatterns(cwd))
      .filter(targets.map((path) => relative(cwd, path)))

    return files.map((file) => ({ file, path: resolve(cwd, file) }))
  },
  write: async (path, content) => writeFile(path, content, 'utf8'),
})
