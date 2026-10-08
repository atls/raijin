import assert                          from 'node:assert/strict'
import { mkdtemp }                     from 'node:fs/promises'
import { mkdir }                       from 'node:fs/promises'
import { writeFile }                   from 'node:fs/promises'
import { tmpdir }                      from 'node:os'
import { join }                        from 'node:path'
import { test }                        from 'node:test'

import { npath }                       from '@yarnpkg/fslib'

import { getExplicitVersionDecisions } from '../deferred-decisions.js'

test('preserves Yarn release and decline decisions across version files', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-versions-'))
  t.after(async () => (await import('node:fs/promises')).rm(root, { recursive: true, force: true }))

  const folder = join(root, 'versions')
  await mkdir(folder)
  await writeFile(
    join(folder, 'one.yml'),
    'releases:\n  "@fixture/a": minor\ndeclined:\n  - "@fixture/b"\n'
  )
  await writeFile(join(folder, 'two.yml'), 'releases:\n  "@fixture/c": 1.2.3\n')

  const decisions = await getExplicitVersionDecisions(npath.toPortablePath(folder))

  assert.deepEqual([...decisions].sort(), ['@fixture/a', '@fixture/b', '@fixture/c'])
})

test('rejects an invalid Yarn version decision', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-versions-'))
  t.after(async () => (await import('node:fs/promises')).rm(root, { recursive: true, force: true }))

  await writeFile(join(root, 'invalid.yml'), 'releases:\n  "@fixture/a": surprise\n')

  await assert.rejects(getExplicitVersionDecisions(npath.toPortablePath(root)), /Invalid strategy/)
})
