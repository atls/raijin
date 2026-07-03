import { strict as assert } from 'node:assert'
import { mkdir }            from 'node:fs/promises'
import { mkdtemp }          from 'node:fs/promises'
import { writeFile }        from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
import { test }             from 'node:test'

import { WebpackExternals } from './webpack.externals.js'

const createResolver = async (): Promise<
  (request: string) => Promise<{ result?: string; type?: string }>
> => {
  const cwd = await mkdtemp(join(tmpdir(), 'code-service-webpack-externals-'))

  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@internal/module': 'workspace:*',
        '@nestjs/common': '^11',
      },
      devDependencies: {
        '@nestjs/terminus': '^10',
      },
      optionalDependencies: {
        '@fastify/swagger-ui': '^5',
      },
      peerDependencies: {
        rxjs: '^7',
      },
    })
  )

  const externals = await new WebpackExternals(cwd).build()

  return async (request: string): Promise<{ result?: string; type?: string }> =>
    new Promise((resolve, reject) => {
      externals({ request }, (error, result, type) => {
        if (error) {
          reject(error)
        } else {
          resolve({ result, type })
        }
      })
    })
}

test('should externalize dependency ranges from all manifest blocks as ESM import externals', async () => {
  const resolveExternal = await createResolver()

  assert.deepEqual(await resolveExternal('@nestjs/common'), { result: undefined, type: undefined })
  assert.deepEqual(await resolveExternal('@nestjs/terminus'), {
    result: '@nestjs/terminus',
    type: 'module',
  })
  assert.deepEqual(await resolveExternal('@fastify/swagger-ui'), {
    result: 'import @fastify/swagger-ui',
    type: undefined,
  })
  assert.deepEqual(await resolveExternal('rxjs'), { result: 'rxjs', type: 'module' })
  assert.deepEqual(await resolveExternal('@internal/module'), {
    result: '@internal/module',
    type: 'module',
  })
})

test('should keep explicit service externals externalized before built-in bundle overrides', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'code-service-webpack-externals-'))

  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@nestjs/common': '^11',
      },
      tools: {
        service: {
          externals: ['@nestjs/common'],
        },
      },
    })
  )

  const externals = await new WebpackExternals(cwd).build()
  const resolveExternal = async (request: string): Promise<{ result?: string; type?: string }> =>
    new Promise((resolve, reject) => {
      externals({ request }, (error, result, type) => {
        if (error) {
          reject(error)
        } else {
          resolve({ result, type })
        }
      })
    })

  assert.deepEqual(await resolveExternal('@nestjs/common'), {
    result: '@nestjs/common',
    type: 'module',
  })
})

test('should keep undeclared transitive npm package roots bundled', async () => {
  const resolveExternal = await createResolver()

  assert.deepEqual(await resolveExternal('@nestjs/cqrs'), {
    result: undefined,
    type: undefined,
  })
  assert.deepEqual(await resolveExternal('@internal/module'), {
    result: '@internal/module',
    type: 'module',
  })
})

test('should keep local workspace dependency ranges bundled', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'code-service-webpack-externals-'))

  await mkdir(join(cwd, 'packages/domain'), { recursive: true })
  await mkdir(join(cwd, 'packages/internal'), { recursive: true })
  await mkdir(join(cwd, 'service'))
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      private: true,
      workspaces: ['packages/*', 'service'],
      packageManager: 'yarn@1.3.25-atls',
    })
  )
  await writeFile(
    join(cwd, 'packages/domain/package.json'),
    JSON.stringify({
      name: '@internal/domain',
      version: '0.1.1',
    })
  )
  await writeFile(
    join(cwd, 'packages/internal/package.json'),
    JSON.stringify({
      name: '@internal/module',
      version: '0.1.1',
      dependencies: {
        '@internal/domain': '0.1.1',
        lodash: '^4',
      },
    })
  )
  await writeFile(
    join(cwd, 'service/package.json'),
    JSON.stringify({
      name: '@internal/service',
      type: 'module',
      dependencies: {
        '@internal/module': '0.1.1',
        react: '^19',
      },
    })
  )

  const externals = await new WebpackExternals(join(cwd, 'service')).build()
  const resolveExternal = async (request: string): Promise<{ result?: string; type?: string }> =>
    new Promise((resolve, reject) => {
      externals({ request }, (error, result, type) => {
        if (error) {
          reject(error)
        } else {
          resolve({ result, type })
        }
      })
    })

  assert.deepEqual(await resolveExternal('@internal/module'), {
    result: undefined,
    type: undefined,
  })
  assert.deepEqual(await resolveExternal('@internal/module/subpath'), {
    result: undefined,
    type: undefined,
  })
  assert.deepEqual(await resolveExternal('@internal/domain'), {
    result: undefined,
    type: undefined,
  })
  assert.deepEqual(await resolveExternal('lodash'), {
    result: undefined,
    type: undefined,
  })
  assert.deepEqual(await resolveExternal('react'), { result: 'react', type: 'module' })
})
