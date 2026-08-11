import assert        from 'node:assert/strict'
import { mkdir }     from 'node:fs/promises'
import { mkdtemp }   from 'node:fs/promises'
import { rm }        from 'node:fs/promises'
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
      writeFile(join(icons, 'uppercase.SVG'), '<svg id="uppercase" />'),
      writeFile(join(icons, 'readme.txt'), 'not an icon'),
      writeFile(join(icons, 'nested', 'child.svg'), '<svg id="child" />'),
    ])

    const sources = await create().read(cwd)

    assert.deepEqual(sources, [
      { content: '<svg id="apple" />', name: 'apple.icon' },
      { content: '<svg id="zebra" />', name: 'zebra' },
    ])
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})
