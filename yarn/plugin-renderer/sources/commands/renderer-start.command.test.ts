import assert                                    from 'node:assert/strict'
import { mkdir }                                 from 'node:fs/promises'
import { mkdtemp }                               from 'node:fs/promises'
import { rm }                                    from 'node:fs/promises'
import { writeFile }                             from 'node:fs/promises'
import { tmpdir }                                from 'node:os'
import { join }                                  from 'node:path'
import { test }                                  from 'node:test'

import { RENDERER_STANDALONE_SERVER_ENTRYPOINT } from './renderer-build.constants.js'
import { resolveRuntimeExecArgvModuleUrl }       from './renderer-start.command.js'

test('should preserve CommonJS extension for Next standalone server entrypoint', () => {
  assert.equal(RENDERER_STANDALONE_SERVER_ENTRYPOINT, 'index.cjs')
})

test('should resolve renderer runtime module through ancestor package boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'renderer-start-workspace-'))
  const workspace = join(root, 'client', 'next-app')
  const runtime = join(root, 'node_modules/@atls/raijin')

  await mkdir(runtime, { recursive: true })
  await mkdir(workspace, { recursive: true })
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      type: 'module',
      devDependencies: {
        '@atls/raijin': 'workspace:*',
      },
    })
  )
  await writeFile(join(workspace, 'package.json'), '{"type":"module"}\n')
  await writeFile(
    join(runtime, 'package.json'),
    JSON.stringify({
      type: 'module',
      exports: {
        './runtime-exec-argv': './runtime-exec-argv.js',
      },
    })
  )
  await writeFile(join(runtime, 'runtime-exec-argv.js'), 'export const value = true\n')

  try {
    assert.equal(
      resolveRuntimeExecArgvModuleUrl(workspace).endsWith(
        '/node_modules/@atls/raijin/runtime-exec-argv.js'
      ),
      true
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
