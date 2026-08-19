import type { CommandInput }                    from '@atls/raijin/commands'

import type { FormatSourcesOptions }            from './format.interfaces.js'
import type { FormatSourcesResult }             from './format.interfaces.js'

import { readFile }                             from 'node:fs/promises'
import { stat }                                 from 'node:fs/promises'
import { writeFile }                            from 'node:fs/promises'
import { relative }                             from 'node:path'
import { resolve }                              from 'node:path'

import { format }                               from 'prettier'
import ignorer                                  from 'ignore'

import { resolvePrettierProject }               from '@atls/raijin/config/prettier'
import { resolvePrettierProjectIgnorePatterns } from '@atls/raijin/config/prettier'
import { discoverFiles }                        from '@atls/raijin/filesystem'
import { toNativePath }                         from '@atls/raijin/filesystem'
import { toPortablePath }                       from '@atls/raijin/filesystem'

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

const resolveExplicitTargets = async (input: CommandInput): Promise<Array<string>> => {
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
      dot: true,
      ignore: discoveryIgnores,
      patterns: sourcePatterns,
    })
  ).map(toNativePath)

const resolveSources = async (
  cwd: string,
  input?: CommandInput
): Promise<Array<{ file: string; path: string }>> => {
  const targets = Array.from(
    new Set(input ? await resolveExplicitTargets(input) : await resolveProjectTargets(cwd))
  )
  const paths = ignorer
    .default()
    .add(ignoredPaths)
    .add(await resolvePrettierProjectIgnorePatterns(cwd))
    .filter(targets.map((path) => relative(cwd, path)))

  return paths.map((file) => ({ file, path: resolve(cwd, file) }))
}

const formatSource = async (
  source: { file: string; path: string },
  workspacePackageNames?: ReadonlyArray<string>
): Promise<FormatSourcesResult['files'][number]> => {
  const content = await readFile(source.path, 'utf8')
  const configuration = await resolvePrettierProject({
    filepath: source.path,
    plugin: { workspacePackageNames },
  })
  const output = await format(content, { ...configuration, filepath: source.file })

  if (output !== content) {
    await writeFile(source.path, output, 'utf8')
  }

  return { file: source.file, status: output === content ? 'unchanged' : 'changed' }
}

export const formatProjectSources = async ({
  cwd,
  targets,
  workspacePackageNames,
}: FormatSourcesOptions): Promise<FormatSourcesResult> => {
  const sources = await resolveSources(cwd, targets)
  const files: Array<FormatSourcesResult['files'][number]> = []

  await sources.reduce<Promise<void>>(async (previous, source) => {
    await previous

    files.push(await formatSource(source, workspacePackageNames))
  }, Promise.resolve())

  return { files }
}
