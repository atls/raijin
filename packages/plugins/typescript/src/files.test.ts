import assert                        from 'node:assert/strict'
import { mkdtemp }                   from 'node:fs/promises'
import { readdir }                   from 'node:fs/promises'
import { rm }                        from 'node:fs/promises'
import { writeFile }                 from 'node:fs/promises'
import { tmpdir }                    from 'node:os'
import { join }                      from 'node:path'
import { test }                      from 'node:test'

import { createCommandInput }        from '@atls/raijin/commands'
import { toPortableCwd }             from '@atls/raijin/commands'
import { ts }                        from '@atls/raijin/typescript'

import { checkFiles }                from './files.js'

test('checks exact files without reading tsconfig or writing files', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-files-'))

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await writeFile(join(cwd, 'tsconfig.json'), '{ invalid json\n')
  await writeFile(
    join(cwd, 'selected.ts'),
    'const unused = true\nexport const selected: string = 1\n'
  )
  await writeFile(join(cwd, 'ignored.ts'), 'export const ignored = missing.value\n')

  const before = (await readdir(cwd, { recursive: true })).sort()
  const input = createCommandInput({
    cwd: toPortableCwd(cwd),
    source: 'explicit',
    targets: ['selected.ts'],
  })
  const diagnostics = checkFiles(input, undefined, ts)

  assert.equal(
    diagnostics.some(
      ({ code, file }) => code === 2322 && file?.fileName.endsWith('/selected.ts')
    ),
    true
  )
  assert.equal(diagnostics.some(({ code }) => code === 6133), false)
  assert.equal(
    diagnostics.some(({ file }) => file?.fileName.endsWith('/ignored.ts')),
    false
  )
  assert.deepEqual((await readdir(cwd, { recursive: true })).sort(), before)
})
