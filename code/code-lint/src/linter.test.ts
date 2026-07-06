import type { LintOptions } from './linter.js'

import assert               from 'node:assert/strict'
import { mkdir }            from 'node:fs/promises'
import { mkdtemp }          from 'node:fs/promises'
import { symlink }          from 'node:fs/promises'
import { writeFile }        from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { dirname }          from 'node:path'
import { join }             from 'node:path'
import { resolve }          from 'node:path'
import { test }             from 'node:test'
import { fileURLToPath }    from 'node:url'

import { Linter }           from './linter.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const raijinPackagePath = resolve(currentDir, '../../../yarn/raijin')

const linkRaijinRuntime = async (cwd: string): Promise<void> => {
  const scopePath = join(cwd, 'node_modules/@atls')

  await mkdir(scopePath, { recursive: true })
  await symlink(raijinPackagePath, join(scopePath, 'raijin'), 'dir')
}

const createProjectWithGeneratedEslintConfig = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-lint-'))

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await linkRaijinRuntime(cwd)
  await writeFile(join(cwd, 'tsconfig.json'), '{"include":["project.types.d.ts","src/**/*.ts"]}\n')
  await writeFile(join(cwd, 'project.types.d.ts'), 'export {}\n')
  await writeFile(join(cwd, '.eslintrc.js'), 'module.exports = {}\n')

  return cwd
}

const lintGeneratedEslintConfig = async (options?: LintOptions): Promise<string> => {
  const cwd = await createProjectWithGeneratedEslintConfig()
  const linter = await Linter.initialize(cwd, cwd)

  const [result] = await linter.lint([join(cwd, '.eslintrc.js')], options)

  return result.messages.map((message) => message.message).join('\n')
}

test('should lint generated eslint config outside tsconfig scope without cache', async () => {
  const messages = await lintGeneratedEslintConfig()

  assert.doesNotMatch(messages, /No matching configuration found/)
  assert.doesNotMatch(messages, /was not found by the project service/)
})

test('should lint generated eslint config outside tsconfig scope with cache', async () => {
  const messages = await lintGeneratedEslintConfig({ cache: true })

  assert.doesNotMatch(messages, /was not found by the project service/)
})

test('should expand explicit directory targets before linting files', async () => {
  const cwd = await createProjectWithGeneratedEslintConfig()
  const src = join(cwd, 'src')
  const linter = await Linter.initialize(cwd, cwd)

  await mkdir(src)
  await writeFile(join(src, 'index.ts'), 'export const value = 1\n')

  const results = await linter.lint(['src'])

  assert.deepEqual(
    results.map((result) => result.filePath),
    [join(src, 'index.ts')]
  )
})

test('should lint workspace file with root tsconfig', async () => {
  const rootCwd = await mkdtemp(join(tmpdir(), 'raijin-lint-'))
  const workspaceCwd = join(rootCwd, 'packages/tools')
  const src = join(workspaceCwd, 'src')

  await mkdir(src, { recursive: true })
  await writeFile(join(workspaceCwd, 'package.json'), '{"type":"module"}\n')
  await linkRaijinRuntime(workspaceCwd)
  await writeFile(join(rootCwd, 'tsconfig.json'), '{"include":["packages/tools/src/**/*.ts"]}\n')
  await writeFile(join(src, 'index.ts'), 'export const value = 1\n')

  const linter = await Linter.initialize(rootCwd, workspaceCwd)
  const [result] = await linter.lint([join(src, 'index.ts')])

  assert.equal(result.filePath, join(src, 'index.ts'))
  assert.doesNotMatch(
    result.messages.map((message) => message.message).join('\n'),
    /was not found by the project service/
  )
})

test('should lint workspace config files outside workspace tsconfig scope', async () => {
  const rootCwd = await mkdtemp(join(tmpdir(), 'raijin-lint-'))
  const workspaceCwd = join(rootCwd, 'client/next-app')

  await mkdir(join(workspaceCwd, 'src'), { recursive: true })
  await writeFile(join(rootCwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(workspaceCwd, 'package.json'), '{"type":"module"}\n')
  await linkRaijinRuntime(workspaceCwd)
  await writeFile(join(workspaceCwd, 'tsconfig.json'), '{"include":["src/**/*.ts"]}\n')
  await writeFile(join(workspaceCwd, 'postcss.config.mjs'), 'export default {}\n')

  const linter = await Linter.initialize(rootCwd, workspaceCwd)
  const [result] = await linter.lint([join(workspaceCwd, 'postcss.config.mjs')])

  assert.equal(result.filePath, join(workspaceCwd, 'postcss.config.mjs'))
  assert.doesNotMatch(
    result.messages.map((message) => message.message).join('\n'),
    /was not found by the project service/
  )
})

test('should expand explicit directory targets with glob metacharacters as literal paths', async () => {
  const cwd = await createProjectWithGeneratedEslintConfig()
  const src = join(cwd, 'src/[id]')
  const linter = await Linter.initialize(cwd, cwd)

  await mkdir(src, { recursive: true })
  await writeFile(join(src, 'index.ts'), 'export const value = 1\n')

  const results = await linter.lint(['src/[id]'])

  assert.deepEqual(
    results.map((result) => result.filePath),
    [join(src, 'index.ts')]
  )
})

test('should fail clearly when explicit linter target does not exist', async () => {
  const cwd = await createProjectWithGeneratedEslintConfig()
  const linter = await Linter.initialize(cwd, cwd)

  await assert.rejects(
    async () => linter.lint(['missing']),
    new Error('Linter target does not exist: missing')
  )
})
