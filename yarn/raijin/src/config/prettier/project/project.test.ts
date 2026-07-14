import assert                                   from 'node:assert/strict'
import { mkdtemp }                              from 'node:fs/promises'
import { readFile }                             from 'node:fs/promises'
import { writeFile }                            from 'node:fs/promises'
import { tmpdir }                               from 'node:os'
import { join }                                 from 'node:path'
import test                                     from 'node:test'

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
