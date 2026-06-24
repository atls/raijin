import type { LintOptions } from './linter.js'

import assert               from 'node:assert/strict'
import { mkdir }            from 'node:fs/promises'
import { mkdtemp }          from 'node:fs/promises'
import { writeFile }        from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
import { test }             from 'node:test'

import { Linter }           from './linter.js'

const createProjectWithGeneratedEslintConfig = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-lint-'))

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
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

test('should fail clearly when explicit linter target does not exist', async () => {
  const cwd = await createProjectWithGeneratedEslintConfig()
  const linter = await Linter.initialize(cwd, cwd)

  await assert.rejects(
    async () => linter.lint(['missing']),
    new Error('Linter target does not exist: missing')
  )
})
