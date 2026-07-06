import assert        from 'node:assert/strict'
import { mkdir }     from 'node:fs/promises'
import { mkdtemp }   from 'node:fs/promises'
import { rm }        from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { tmpdir }    from 'node:os'
import { join }      from 'node:path'
import test          from 'node:test'

import { Service }   from './service.js'

test('should import service webpack runtime through ancestor package boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'service-runtime-workspace-'))
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
        './webpack': './webpack.js',
      },
    })
  )
  await writeFile(
    join(runtime, 'runtime-exec-argv.js'),
    'export const createRuntimeExecArgv = () => ["--enable-source-maps"]\n'
  )
  await writeFile(
    join(runtime, 'webpack.js'),
    [
      'export const webpack = () => undefined',
      'export const tsLoaderPath = "ts-loader"',
      'export const nodeLoaderPath = "node-loader"',
      'export const protoLoaderPath = "proto-loader"',
    ].join('\n')
  )

  try {
    assert.ok(await Service.initialize(workspace))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
