import assert        from 'node:assert/strict'
import { mkdir }     from 'node:fs/promises'
import { mkdtemp }   from 'node:fs/promises'
import { readFile }  from 'node:fs/promises'
import { rm }        from 'node:fs/promises'
import { symlink }   from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { tmpdir }    from 'node:os'
import { join }      from 'node:path'
import { test }      from 'node:test'

import { create }    from '../source.js'

test('should read only direct lowercase svg files in deterministic basename order', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-source-'))
  const icons = join(cwd, 'icons')

  try {
    await mkdir(join(icons, 'nested'), { recursive: true })
    await Promise.all([
      writeFile(join(icons, 'zebra.svg'), '<svg id="zebra" />'),
      writeFile(join(icons, 'apple.icon.svg'), '<svg id="apple" />'),
      writeFile(join(cwd, 'shared.svg'), '<svg id="shared" />'),
      writeFile(join(icons, 'uppercase.SVG'), '<svg id="uppercase" />'),
      writeFile(join(icons, 'readme.txt'), 'not an icon'),
      writeFile(join(icons, 'nested', 'child.svg'), '<svg id="child" />'),
    ])
    await symlink('../shared.svg', join(icons, 'shared.svg'))

    const sources = await create().read(cwd)

    assert.deepEqual(sources, [
      { content: '<svg id="apple" />', name: 'apple.icon' },
      { content: '<svg id="shared" />', name: 'shared' },
      { content: '<svg id="zebra" />', name: 'zebra' },
    ])
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})

test('should reject a linked icon source boundary', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-source-'))
  const external = await mkdtemp(join(tmpdir(), 'raijin-icon-source-external-'))
  const icons = join(cwd, 'icons')

  try {
    await writeFile(join(external, 'alert.svg'), '<svg id="external" />')
    await symlink(external, icons, 'junction')

    await assert.rejects(create().read(cwd), {
      message: 'Icon source boundary must be a directory: icons',
    })
    assert.equal(await readFile(join(external, 'alert.svg'), 'utf8'), '<svg id="external" />')
  } finally {
    await Promise.all([
      rm(cwd, { force: true, recursive: true }),
      rm(external, { force: true, recursive: true }),
    ])
  }
})

test('should reject a non-file svg source entry', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icon-source-'))
  const icons = join(cwd, 'icons')

  try {
    await mkdir(join(icons, 'nested.svg'), { recursive: true })

    await assert.rejects(create().read(cwd), {
      message: 'Icon source path must be a regular file: nested.svg',
    })
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})
