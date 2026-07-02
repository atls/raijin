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

test('should keep development service builds in the ESM module graph', async () => {
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
  ).build('development')

  assert.ok(config.output)

  const { output } = config

  assert.equal(output.chunkFormat, 'module')
  assert.equal(output.module, true)
  assert.deepEqual(output.library, { type: 'module' })
  assert.deepEqual(config.experiments, { outputModule: true })
  assert.equal(config.externalsType, 'import')
  assert.equal(config.resolve?.extensionAlias?.['.cjs'], undefined)
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

test('should keep static dependency imports in the ESM async module graph', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'code-service-webpack-config-'))

  await mkdir(join(cwd, 'src'))
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      type: 'module',
      dependencies: {
        react: '^19',
      },
    })
  )
  await writeFile(
    join(cwd, 'src/index.ts'),
    `import React from 'react'

export const element = React.createElement('div')
`
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

  assert.match(output, /module\.exports = import\("react"\)/)
  assert.match(output, /__webpack_require__\.a\(/)
  assert.match(output, /react__WEBPACK_IMPORTED_MODULE_0__\["default"\]\.createElement/)
  assert.doesNotMatch(output, /react_1\.default\.createElement/)
})
