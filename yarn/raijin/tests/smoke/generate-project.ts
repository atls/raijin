/* eslint-disable no-console */

import type { CommandContext }    from '@yarnpkg/core'
import type { CommandClass }      from 'clipanion'

import assert                     from 'node:assert/strict'
import { access }                 from 'node:fs/promises'
import { mkdir }                  from 'node:fs/promises'
import { mkdtemp }                from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { rm }                     from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { join }                   from 'node:path'
import { pathToFileURL }          from 'node:url'

import { getPluginConfiguration } from '@yarnpkg/cli'
import { npath }                  from '@yarnpkg/fslib'
import { Cli }                    from 'clipanion'

type ScaffoldType = 'library' | 'project'

const loadGenerateProjectCommand = async (): Promise<CommandClass<CommandContext>> => {
  const commandPath = pathToFileURL(
    join(import.meta.dirname, '../../dist/commands/generate/project/command.js')
  ).href
  const commandModule = (await import(commandPath)) as {
    GenerateProjectCommand: CommandClass<CommandContext>
  }

  return commandModule.GenerateProjectCommand
}

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
  await mkdir(join(projectRoot, '.yarn/schematic'), { recursive: true })
  await writeFile(
    join(projectRoot, 'package.json'),
    `${JSON.stringify({ private: true, workspaces: ['packages/*'] }, null, 2)}\n`
  )
  await writeFile(join(projectRoot, 'yarn.lock'), '')
  await writeFile(
    join(target, 'package.json'),
    `${JSON.stringify({ name: '@fixture/client', private: true, type: 'module' }, null, 2)}\n`
  )
  await writeFile(join(target, 'tsconfig.json'), '{"compilerOptions":{"composite":true}}\n')
  await writeFile(join(target, '.gitignore'), 'fixture-cache/\n')
  await writeFile(join(projectRoot, '.yarn/schematic/collection.json'), '{"stale":true}\n')
}

const runCommand = async (target: string, type: ScaffoldType): Promise<number> => {
  const cli = new Cli<CommandContext>({ binaryName: 'yarn', enableCapture: false })

  cli.register(await loadGenerateProjectCommand())

  return cli.run(['generate', 'project', '--type', type], {
    cwd: npath.toPortablePath(target),
    plugins: getPluginConfiguration(),
    quiet: false,
  })
}

const assertCommonContract = async (target: string): Promise<void> => {
  const tsconfig = JSON.parse(await readFile(join(target, 'tsconfig.json'), 'utf8')) as {
    compilerOptions: Record<string, unknown>
  }

  assert.equal(
    await readFile(join(target, '.prettierrc.mjs'), 'utf8'),
    "import config from '@atls/raijin/prettier'\n\nexport default config\n"
  )
  assert.match(await readFile(join(target, 'eslint.config.mjs'), 'utf8'), /@atls\/raijin\/eslint/)
  assert.match(await readFile(join(target, '.github/workflows/checks.yaml'), 'utf8'), /yarn check/)
  assert.equal(tsconfig.compilerOptions.composite, true)
  assert.equal(tsconfig.compilerOptions.module, 'NodeNext')
  assert.equal(tsconfig.compilerOptions.target, 'es2022')

  const gitignore = await readFile(join(target, '.gitignore'), 'utf8')

  assert.match(gitignore, /node_modules/)
  assert.match(gitignore, /dist\//)
  assert.equal(gitignore.match(/fixture-cache\//g)?.length, 1)
}

const assertTypeContract = async (target: string, type: ScaffoldType): Promise<void> => {
  if (type === 'project') {
    assert.match(
      await readFile(join(target, '.github/workflows/release.yaml'), 'utf8'),
      /@fixture\/client-/
    )
    assert.match(
      await readFile(join(target, '.github/workflows/preview.yaml'), 'utf8'),
      /@fixture\/client-/
    )
    assert.equal(await pathExists(join(target, '.github/workflows/publish.yaml')), false)
    assert.equal(await pathExists(join(target, '.github/workflows/version.yaml')), false)

    return
  }

  assert.match(
    await readFile(join(target, '.github/workflows/publish.yaml'), 'utf8'),
    /npm publish --access public/
  )
  assert.match(
    await readFile(join(target, '.github/workflows/version.yaml'), 'utf8'),
    /version patch --deferred/
  )
  assert.equal(await pathExists(join(target, '.github/workflows/release.yaml')), false)
  assert.equal(await pathExists(join(target, '.github/workflows/preview.yaml')), false)
}

const runScenario = async (type: ScaffoldType): Promise<void> => {
  const fixture = await mkdtemp(join(tmpdir(), `raijin-${type}-generation-`))
  const projectRoot = join(fixture, 'project')
  const target = join(projectRoot, 'packages/client')

  try {
    await writeFixture(projectRoot, target)

    assert.equal(await runCommand(target, type), 0)
    assert.equal(
      await readFile(join(projectRoot, '.yarn/schematic/collection.json'), 'utf8'),
      '{"stale":true}\n'
    )

    await assertCommonContract(target)
    await assertTypeContract(target, type)
  } finally {
    await rm(fixture, { recursive: true, force: true })
  }
}

try {
  await runScenario('project')
  await runScenario('library')
  console.info('Project generation command smoke passed')
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
}
