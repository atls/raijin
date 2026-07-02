import { strict as assert } from 'node:assert'
import { mkdtemp }          from 'node:fs/promises'
import { writeFile }        from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
import { test }             from 'node:test'

import { webpack }          from '@atls/raijin/webpack'

import { WebpackConfig }    from './webpack.config.js'

test('should prefer runtime JavaScript before TypeScript declarations for extensionless imports', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'code-service-webpack-config-'))

  await writeFile(join(cwd, 'package.json'), JSON.stringify({ type: 'module' }))

  const config = await new WebpackConfig(
    webpack,
    {
      nodeLoader: 'node-loader',
      protoLoader: 'proto-loader',
      tsLoader: 'ts-loader',
    },
    cwd
  ).build()

  assert.ok(config.resolve)
  assert.deepEqual(config.resolve.extensionAlias, {
    '.cjs': ['.cjs', '.cts'],
    '.js': ['.js', '.tsx', '.ts'],
    '.jsx': ['.jsx', '.tsx', '.ts'],
    '.mjs': ['.mjs', '.mts'],
  })
  assert.deepEqual(config.resolve.extensions, ['.js', '.tsx', '.ts'])
})
