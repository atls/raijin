import assert                           from 'node:assert/strict'
import { mkdtemp }                      from 'node:fs/promises'
import { mkdir }                        from 'node:fs/promises'
import { writeFile }                    from 'node:fs/promises'
import { tmpdir }                       from 'node:os'
import { join }                         from 'node:path'
import test                             from 'node:test'

import { resolveWorkspacePackageNames } from './import-sort.api.js'
import { resolveWorkspaceRoot }         from './import-sort.api.js'

test('should resolve workspace root from nested package directory', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-import-sort-'))
  const workspace = join(cwd, 'packages/client')
  const nested = join(workspace, 'src/app')

  await mkdir(nested, { recursive: true })
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      workspaces: ['packages/*'],
    })
  )
  await writeFile(
    join(workspace, 'package.json'),
    JSON.stringify({
      name: '@scope/client',
    })
  )

  assert.equal(resolveWorkspaceRoot(nested), cwd)
})

test('should resolve workspace package names from nested package directory', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-import-sort-'))
  const workspace = join(cwd, 'packages/client')
  const nested = join(workspace, 'src/app')

  await mkdir(nested, { recursive: true })
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      workspaces: {
        packages: ['packages/*'],
      },
    })
  )
  await writeFile(
    join(workspace, 'package.json'),
    JSON.stringify({
      name: '@scope/client',
    })
  )

  assert.deepEqual(resolveWorkspacePackageNames(nested), ['@scope/client'])
})
