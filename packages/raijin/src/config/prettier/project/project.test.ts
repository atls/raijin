import assert                                   from 'node:assert/strict'
import { mkdtemp }                              from 'node:fs/promises'
import { mkdir }                                from 'node:fs/promises'
import { readFile }                             from 'node:fs/promises'
import { writeFile }                            from 'node:fs/promises'
import { tmpdir }                               from 'node:os'
import { join }                                 from 'node:path'
import test                                     from 'node:test'

import { format }                               from 'prettier/standalone'

import { resolvePrettierProject }               from './project.js'
import { resolvePrettierProjectIgnorePatterns } from './project.js'

test('should resolve project config without changing it', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-prettier-config-'))
  const configPath = join(cwd, '.prettierrc.mjs')
  const source = 'export default { printWidth: 72, semi: true }\n'

  await writeFile(
    join(cwd, 'package.json'),
    '{"type":"module","formatterIgnorePatterns":["generated/**"]}\n'
  )
  await writeFile(configPath, source)

  const config = await resolvePrettierProject({ filepath: join(cwd, 'src/index.ts') })

  assert.equal(config.printWidth, 72)
  assert.equal(config.semi, true)
  assert.ok(config.plugins?.length)
  assert.deepEqual(await resolvePrettierProjectIgnorePatterns(cwd), ['generated/**'])
  assert.equal(await readFile(configPath, 'utf8'), source)
})

test('should load project plugin package names for standalone formatting', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-prettier-plugin-'))
  const pluginCwd = join(cwd, 'node_modules/fixture-prettier-plugin')

  await mkdir(pluginCwd, { recursive: true })
  await writeFile(
    join(cwd, 'package.json'),
    '{"type":"module","dependencies":{"fixture-prettier-plugin":"1.0.0"}}\n'
  )
  await writeFile(
    join(cwd, '.prettierrc.mjs'),
    `export default { plugins: ['fixture-prettier-plugin'] }\n`
  )
  await writeFile(
    join(pluginCwd, 'package.json'),
    '{"name":"fixture-prettier-plugin","version":"1.0.0","type":"module","exports":"./index.js"}\n'
  )
  await writeFile(join(pluginCwd, 'index.js'), 'export default { languages: [] }\n')

  const config = await resolvePrettierProject({ filepath: join(cwd, 'src/index.ts') })
  const output = await format('const value=1', {
    ...config,
    filepath: join(cwd, 'src/index.ts'),
  })
  const plugins = config.plugins ?? []

  assert.equal(
    plugins.some((plugin) => typeof plugin === 'string'),
    false
  )
  assert.equal(
    plugins.some((plugin) => typeof plugin === 'object' && 'languages' in plugin),
    true
  )
  assert.equal(output, 'const value = 1\n')
})
