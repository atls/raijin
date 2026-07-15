import assert                                 from 'node:assert/strict'
import { mkdir }                              from 'node:fs/promises'
import { mkdtemp }                            from 'node:fs/promises'
import { readFile }                           from 'node:fs/promises'
import { writeFile }                          from 'node:fs/promises'
import { tmpdir }                             from 'node:os'
import { join }                               from 'node:path'
import test                                   from 'node:test'
import { setTimeout }                         from 'node:timers/promises'

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

test('should preserve the base directory of an ancestor config', async () => {
  const rootCwd = await mkdtemp(join(tmpdir(), 'raijin-eslint-root-config-'))
  const cwd = join(rootCwd, 'packages/app')
  const filePath = join(cwd, 'src/index.ts')

  await mkdir(join(cwd, 'src'), { recursive: true })
  await writeFile(join(rootCwd, 'project-rules.mjs'), `export default { 'no-console': 'off' }\n`)
  await writeFile(
    join(rootCwd, 'eslint.config.mjs'),
    `import rules from './project-rules.mjs'\nexport default [{ files: ['packages/*/src/**/*.ts'], rules }]\n`
  )
  await writeFile(join(rootCwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(rootCwd, 'tsconfig.json'), '{"files":[]}\n')
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(filePath, 'console.log("value")\n')

  const options = await resolveEslintProject({ cwd, eslint: ESLint, rootCwd })
  const eslint = new ESLint(options)
  const [result] = await eslint.lintFiles([filePath])

  assert.equal(options.cwd, cwd)
  assert.equal(
    result.messages.some(({ ruleId }) => ruleId === 'no-console'),
    false
  )
})

test('should preserve global ignores from an ancestor config', async () => {
  const rootCwd = await mkdtemp(join(tmpdir(), 'raijin-eslint-global-ignore-'))
  const cwd = join(rootCwd, 'packages/app')
  const ignoredPath = join(cwd, 'generated/index.ts')

  await mkdir(join(cwd, 'generated'), { recursive: true })
  await writeFile(
    join(rootCwd, 'eslint.config.mjs'),
    `export default [{ ignores: ['packages/app/generated/**'] }]\n`
  )
  await writeFile(join(rootCwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(rootCwd, 'tsconfig.json'), '{"files":[]}\n')
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(ignoredPath, 'console.log("ignored")\n')

  const eslint = new ESLint(await resolveEslintProject({ cwd, eslint: ESLint, rootCwd }))

  assert.equal(await eslint.isPathIgnored(ignoredPath), true)
})

test('should reload project config through the ESLint loader', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-eslint-reload-'))
  const configPath = join(cwd, 'eslint.config.mjs')
  const filePath = join(cwd, 'index.ts')

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'tsconfig.json'), '{"files":["index.ts"]}\n')
  await writeFile(
    configPath,
    `export default [{ files: ['**/*.ts'], rules: { 'no-console': 'off' } }]\n`
  )
  await writeFile(filePath, 'console.log("value")\n')

  const initial = new ESLint(await resolveEslintProject({ cwd, eslint: ESLint, rootCwd: cwd }))
  const [initialResult] = await initial.lintFiles([filePath])

  await setTimeout(20)
  await writeFile(
    configPath,
    `export default [{ files: ['**/*.ts'], rules: { 'no-console': 'error' } }]\n`
  )

  const reloaded = new ESLint(await resolveEslintProject({ cwd, eslint: ESLint, rootCwd: cwd }))
  const [reloadedResult] = await reloaded.lintFiles([filePath])

  assert.equal(
    initialResult.messages.some(({ ruleId }) => ruleId === 'no-console'),
    false
  )
  assert.equal(
    reloadedResult.messages.some(({ ruleId }) => ruleId === 'no-console'),
    true
  )
})
