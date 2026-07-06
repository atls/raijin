import assert                              from 'node:assert/strict'
import { mkdir }                           from 'node:fs/promises'
import { mkdtemp }                         from 'node:fs/promises'
import { rm }                              from 'node:fs/promises'
import { writeFile }                       from 'node:fs/promises'
import { tmpdir }                          from 'node:os'
import { join }                            from 'node:path'
import test                                from 'node:test'

import { createServiceExecArgv }           from '../src/service-exec-argv.js'
import { createServiceRuntimeExecArgv }    from '../src/service-exec-argv.js'
import { resolveRuntimeExecArgvModuleUrl } from '../src/service-exec-argv.js'

test('should expose service exec argv through runtime contract', () => {
  assert.deepEqual(
    createServiceExecArgv('file:///repo/.pnp.loader.mjs', 'file:///runtime/typescript-loader.js'),
    [
      '--loader',
      'file:///repo/.pnp.loader.mjs',
      '--loader',
      'file:///runtime/typescript-loader.js',
      '--enable-source-maps',
    ]
  )
})

test('should resolve service runtime module through ancestor package boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'service-exec-argv-workspace-'))
  const workspace = join(root, 'server', 'api')
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
  await writeFile(
    join(runtime, 'runtime-exec-argv.js'),
    'export const createRuntimeExecArgv = (cwd) => ["workspace:" + cwd]\n'
  )

  try {
    assert.equal(
      resolveRuntimeExecArgvModuleUrl(workspace).endsWith(
        '/node_modules/@atls/raijin/runtime-exec-argv.js'
      ),
      true
    )
    assert.deepEqual(await createServiceRuntimeExecArgv(workspace), [`workspace:${workspace}`])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
