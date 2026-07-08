import assert             from 'node:assert/strict'
import { mkdir }          from 'node:fs/promises'
import { mkdtemp }        from 'node:fs/promises'
import { readFile }       from 'node:fs/promises'
import { writeFile }      from 'node:fs/promises'
import { tmpdir }         from 'node:os'
import { join }           from 'node:path'
import { test }           from 'node:test'

import { npath }          from '@yarnpkg/fslib'

import { prepareTmpDir }  from '../prepare-tmp-dir.js'
import { resolvePnpRoot } from '../prepare-tmp-dir.js'

const withCwd = async (cwd: string, callback: () => Promise<void>): Promise<void> => {
  const previousCwd = process.cwd()

  try {
    process.chdir(cwd)
    await callback()
  } finally {
    process.chdir(previousCwd)
  }
}

test('should resolve pnp root from nested workspace cwd', async () => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-schematic-pnp-root-'))
  const workspace = join(root, 'client/next-app')

  await mkdir(workspace, { recursive: true })
  await writeFile(join(root, '.pnp.cjs'), 'root-pnp\n')

  assert.equal(await resolvePnpRoot(npath.toPortablePath(workspace)), npath.toPortablePath(root))
})

test('should prepare temporary schematic dir from nested workspace cwd', async () => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-schematic-prepare-'))
  const workspace = join(root, 'client/next-app')
  const tmpDir = await mkdtemp(join(tmpdir(), 'raijin-schematic-tmp-'))

  await mkdir(join(workspace, 'runtime'), { recursive: true })
  await mkdir(join(root, 'client/next-app'), { recursive: true })
  await Promise.all([
    writeFile(join(root, '.pnp.cjs'), 'root-pnp\n'),
    writeFile(join(workspace, 'package.json'), '{"name":"next-app"}\n'),
  ])

  await withCwd(workspace, async () => {
    await prepareTmpDir(npath.toPortablePath(tmpDir))
  })

  assert.equal(await readFile(join(tmpDir, '.pnp.cjs'), 'utf-8'), 'root-pnp\n')
  assert.equal(await readFile(join(tmpDir, 'package.json'), 'utf-8'), '{"name":"next-app"}\n')
})
