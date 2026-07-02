import { strict as assert } from 'node:assert'
import { mkdtemp }          from 'node:fs/promises'
import { readFile }         from 'node:fs/promises'
import { mkdir }            from 'node:fs/promises'
import { writeFile }        from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
import { test }             from 'node:test'

import { nodeLoaderPath }   from '@atls/raijin/webpack'
import { protoLoaderPath }  from '@atls/raijin/webpack'
import { tsLoaderPath }     from '@atls/raijin/webpack'
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

test('should reject non ESM service workspaces', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'code-service-webpack-config-'))

  await writeFile(join(cwd, 'package.json'), JSON.stringify({ type: 'commonjs' }))

  await assert.rejects(
    new WebpackConfig(
      webpack,
      {
        nodeLoader: 'node-loader',
        protoLoader: 'proto-loader',
        tsLoader: 'ts-loader',
      },
      cwd
    ).build(),
    /supports only ESM workspaces/
  )
})

test('should keep optional dependency imports lazy in ESM production builds', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'code-service-webpack-config-'))

  await mkdir(join(cwd, 'src'))
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      type: 'module',
      optionalDependencies: {
        '@fastify/swagger-ui': '^5',
      },
    })
  )
  await writeFile(
    join(cwd, 'src/index.ts'),
    `export const loadSwaggerUi = async () => import('@fastify/swagger-ui')\n`
  )

  const config = await new WebpackConfig(
    webpack,
    {
      nodeLoader: nodeLoaderPath,
      protoLoader: protoLoaderPath,
      tsLoader: tsLoaderPath,
    },
    cwd
  ).build()

  const compiler = webpack(config)

  await new Promise<void>((resolve, reject) => {
    compiler.run((error, stats) => {
      compiler.close((closeError) => {
        if (error || closeError) {
          reject(error || closeError)
        } else if (stats?.hasErrors()) {
          reject(new Error(stats.toString({ all: false, errors: true })))
        } else {
          resolve()
        }
      })
    })
  })

  const output = await readFile(join(cwd, 'dist/index.js'), 'utf-8')

  assert.match(output, /import\("@fastify\/swagger-ui"\)/)
  assert.doesNotMatch(output, /import \* as .* from "@fastify\/swagger-ui"/)
})
