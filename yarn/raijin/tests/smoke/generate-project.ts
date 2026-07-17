/* eslint-disable no-console */

import type { RaijinProjectModel }          from '@atls/raijin/project'

import { access }                           from 'node:fs/promises'
import { mkdir }                            from 'node:fs/promises'
import { mkdtemp }                          from 'node:fs/promises'
import { readFile }                         from 'node:fs/promises'
import { rm }                               from 'node:fs/promises'
import { writeFile }                        from 'node:fs/promises'
import { tmpdir }                           from 'node:os'
import { join }                             from 'node:path'

import { npath }                            from '@yarnpkg/fslib'

import { generateProject }                  from '@atls/raijin/commands'
import { installProjectGenerationArtifact } from '@atls/raijin/commands'
import { createCommandInput }               from '@atls/raijin/commands/input'

const requiredGeneratedFiles = [
  '.gitignore',
  '.prettierrc.mjs',
  '.github/workflows/checks.yaml',
  '.github/workflows/preview.yaml',
  '.github/workflows/release.yaml',
  'tsconfig.json',
]

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

const writeFixture = async (projectRoot: string, target: string): Promise<void> => {
  await mkdir(target, { recursive: true })
  await writeFile(
    join(projectRoot, 'package.json'),
    `${JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2)}\n`
  )
  await writeFile(
    join(target, 'package.json'),
    `${JSON.stringify({ name: '@fixture/client', private: true, type: 'module' }, null, 2)}\n`
  )
  await writeFile(join(target, 'tsconfig.json'), '{}\n')
}

const assertGeneratedFixture = async (target: string): Promise<void> => {
  const missingFiles = (
    await Promise.all(
      requiredGeneratedFiles.map(async (file) => ({
        file,
        exists: await pathExists(join(target, file)),
      }))
    )
  )
    .filter(({ exists }) => !exists)
    .map(({ file }) => file)

  if (missingFiles.length > 0) {
    throw new Error(`Project generation did not create:\n${missingFiles.join('\n')}`)
  }

  const gitignore = await readFile(join(target, '.gitignore'), 'utf8')

  if (!gitignore.includes('node_modules') || !gitignore.includes('dist/')) {
    throw new Error('Generated .gitignore does not contain expected baseline entries')
  }

  const tsconfig = JSON.parse(await readFile(join(target, 'tsconfig.json'), 'utf8')) as {
    compilerOptions?: unknown
  }

  if (!tsconfig.compilerOptions || typeof tsconfig.compilerOptions !== 'object') {
    throw new Error('Generated tsconfig.json does not contain compilerOptions')
  }
}

const runSmoke = async (): Promise<void> => {
  const fixture = await mkdtemp(join(tmpdir(), 'raijin-project-generation-'))
  const projectRoot = join(fixture, 'project')
  const target = join(projectRoot, 'packages/client')
  const projectCwd = npath.toPortablePath(projectRoot)
  const targetCwd = npath.toPortablePath(target)

  try {
    await writeFixture(projectRoot, target)
    await installProjectGenerationArtifact(projectRoot)

    const topLevelWorkspace = {
      cwd: projectCwd,
      manifest: { workspaceDefinitions: [{ pattern: 'packages/*' }] },
    }
    const project: RaijinProjectModel<typeof topLevelWorkspace> = {
      cwd: projectCwd,
      topLevelWorkspace,
      type: 'monorepo',
      workspacePatterns: ['packages/*'],
      workspaces: [topLevelWorkspace],
    }
    const exitCode = await generateProject({
      input: createCommandInput({
        cwd: targetCwd,
        source: 'explicit',
        targets: ['.'],
      }),
      project,
      type: 'project',
    })

    if (exitCode !== 0) {
      throw new Error(`Project generation failed with exit code ${exitCode}`)
    }

    await assertGeneratedFixture(target)
  } finally {
    await rm(fixture, { recursive: true, force: true })
  }
}

try {
  await runSmoke()
  console.info('Project generation smoke passed')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
