import assert                   from 'node:assert/strict'
import { mkdtemp }              from 'node:fs/promises'
import { readdir }              from 'node:fs/promises'
import { rm }                   from 'node:fs/promises'
import { tmpdir }               from 'node:os'
import { join }                 from 'node:path'
import { test }                 from 'node:test'

import { npath }                from '@yarnpkg/fslib'

import { get as getProject }    from '../../tests/project.js'
import { createCommandWrapper } from '../binaries.js'
import { createShellWrapper }   from '../binaries.js'
import { install }              from '../binaries.js'

test('should create a Windows command wrapper with escaped arguments', () => {
  assert.equal(
    createCommandWrapper('C:\\Program Files\\node.exe', ['C:\\fixture "quoted".js']),
    '@goto #_undefined_# 2>NUL || @title %COMSPEC% & @setlocal & @"C:\\Program Files\\node.exe" "C:\\fixture ""quoted"".js" %*'
  )
})

test('should create a POSIX shell wrapper with escaped arguments', () => {
  assert.equal(
    createShellWrapper('/usr/bin/node', ["/tmp/fixture's program.js"]),
    `#!/bin/sh\nexec '/usr/bin/node' '/tmp/fixture'"'"'s program.js' "$@"\n`
  )
})

test('should install binaries reported by Yarn', async () => {
  const { project, workspace } = await getProject()
  await project.restoreInstallState()

  const folder = npath.toPortablePath(await mkdtemp(join(tmpdir(), 'raijin-binaries-')))

  try {
    await install({ folder, locator: workspace.anchoredLocator, project })

    const binaries = await readdir(npath.fromPortablePath(folder))

    assert.ok(binaries.includes('prettier'))
    assert.ok(binaries.includes('tsc'))
  } finally {
    await rm(npath.fromPortablePath(folder), { force: true, recursive: true })
  }
})
