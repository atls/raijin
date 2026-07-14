import assert                                 from 'node:assert/strict'
import { mkdtemp }                            from 'node:fs/promises'
import { readFile }                           from 'node:fs/promises'
import { writeFile }                          from 'node:fs/promises'
import { tmpdir }                             from 'node:os'
import { join }                               from 'node:path'
import test                                   from 'node:test'

import { ESLint }                             from '../../../runtime/eslint.js'
import { resolveEslintProject }               from './project.js'
import { resolveEslintProjectIgnorePatterns } from './project.js'

test('should let project config override defaults without changing it', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-eslint-config-'))
  const configPath = join(cwd, 'eslint.config.mjs')
  const filePath = join(cwd, 'index.ts')
  const configSource = `export default [{ files: ['**/*.ts'], rules: { 'no-console': 'off' } }]\n`

  await writeFile(
    join(cwd, 'package.json'),
    '{"type":"module","linterIgnorePatterns":["generated/**"]}\n'
  )
  await writeFile(join(cwd, 'tsconfig.json'), '{"files":["index.ts"]}\n')
  await writeFile(configPath, configSource)
  await writeFile(filePath, 'console.log("value")\n')

  const eslint = new ESLint(await resolveEslintProject({ cwd, eslint: ESLint, rootCwd: cwd }))
  const [result] = await eslint.lintFiles([filePath])

  assert.equal(
    result.messages.some(({ ruleId }) => ruleId === 'no-console'),
    false
  )
  assert.deepEqual(await resolveEslintProjectIgnorePatterns(cwd), ['generated/**'])
  assert.equal(await readFile(configPath, 'utf8'), configSource)
})

test('should use defaults when project config is absent', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-eslint-defaults-'))
  const filePath = join(cwd, 'index.ts')

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'tsconfig.json'), '{"files":["index.ts"]}\n')
  await writeFile(filePath, 'console.log("value")\n')

  const eslint = new ESLint(await resolveEslintProject({ cwd, eslint: ESLint, rootCwd: cwd }))
  const [result] = await eslint.lintFiles([filePath])

  assert.equal(
    result.messages.some(({ ruleId }) => ruleId === 'no-console'),
    true
  )
})
