import assert                   from 'node:assert/strict'
import { mkdtemp }              from 'node:fs/promises'
import { readFile }             from 'node:fs/promises'
import { writeFile }            from 'node:fs/promises'
import { tmpdir }               from 'node:os'
import { join }                 from 'node:path'
import { test }                 from 'node:test'

import { createCommandInput }   from '../../../commands/index.js'
import { toPortableCwd }        from '../../../commands/index.js'
import { formatProjectSources } from '../index.js'

test('should apply project Prettier configuration and return file outcomes', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-format-project-'))
  const filepath = join(cwd, 'index.ts')

  await writeFile(join(cwd, 'package.json'), '{"private":true,"type":"module"}\n')
  await writeFile(join(cwd, '.prettierrc.mjs'), 'export default { semi: false }\n')
  await writeFile(filepath, 'const value={foo:1};\n')

  const targets = createCommandInput({
    cwd: toPortableCwd(cwd),
    source: 'explicit',
    targets: ['index.ts'],
  })

  assert.deepEqual(await formatProjectSources({ cwd, targets }), {
    files: [{ file: 'index.ts', status: 'changed' }],
  })
  assert.equal(await readFile(filepath, 'utf8'), 'const value = { foo: 1 }\n')
  assert.deepEqual(await formatProjectSources({ cwd, targets }), {
    files: [{ file: 'index.ts', status: 'unchanged' }],
  })
})
