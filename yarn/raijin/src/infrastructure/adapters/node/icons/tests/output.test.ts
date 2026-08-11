import assert        from 'node:assert/strict'
import { mkdir }     from 'node:fs/promises'
import { mkdtemp }   from 'node:fs/promises'
import { readFile }  from 'node:fs/promises'
import { rm }        from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { tmpdir }    from 'node:os'
import { join }      from 'node:path'
import { test }      from 'node:test'

import { create }    from '../output.js'

test('should replace generated modules and index while preserving unrelated source files', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-output-'))
  const source = join(cwd, 'src')

  try {
    await mkdir(source)
    await Promise.all([
      writeFile(join(source, 'Stale.icon.tsx'), 'stale output'),
      writeFile(join(source, 'Bell.icon.tsx'), 'previous bell output'),
      writeFile(join(source, 'manual.tsx'), 'manual source'),
      writeFile(join(source, 'keep.ts'), 'unrelated source'),
    ])

    const files = await create().replace(cwd, [
      { component: 'BellIcon', content: 'export const BellIcon = null\n', name: 'Bell' },
      { component: 'UserIcon', content: 'export const UserIcon = null\n', name: 'User' },
    ])

    assert.deepEqual(files, ['src/Bell.icon.tsx', 'src/User.icon.tsx', 'src/index.ts'])
    assert.equal(await readFile(join(source, 'Bell.icon.tsx'), 'utf8'), 'export const BellIcon = null\n')
    assert.equal(await readFile(join(source, 'User.icon.tsx'), 'utf8'), 'export const UserIcon = null\n')
    assert.equal(
      await readFile(join(source, 'index.ts'), 'utf8'),
      "export * from './Bell.icon.jsx'\nexport * from './User.icon.jsx'"
    )
    await assert.rejects(readFile(join(source, 'Stale.icon.tsx')), { code: 'ENOENT' })
    assert.equal(await readFile(join(source, 'manual.tsx'), 'utf8'), 'manual source')
    assert.equal(await readFile(join(source, 'keep.ts'), 'utf8'), 'unrelated source')
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})
