import assert                               from 'node:assert/strict'
import { mkdir }                            from 'node:fs/promises'
import { mkdtemp }                          from 'node:fs/promises'
import { writeFile }                        from 'node:fs/promises'
import { tmpdir }                           from 'node:os'
import { join }                             from 'node:path'
import test                                 from 'node:test'

import { createOptionalImportIgnorePlugin } from '../src/webpack.ignore.js'
import { findPackageManifestPath }          from '../src/webpack.ignore.js'
import { getPackageNameFromContext }        from '../src/webpack.ignore.js'
import { getPackageNameFromRequest }        from '../src/webpack.ignore.js'
import { isOptionalImport }                 from '../src/webpack.ignore.js'
import { shouldIgnoreOptionalImport }       from '../src/webpack.ignore.js'

const writeManifest = async (path: string, manifest: Record<string, unknown>): Promise<void> => {
  await mkdir(path, { recursive: true })
  await writeFile(join(path, 'package.json'), JSON.stringify(manifest))
}

const createResolver = (resolvableRequests: Array<string>) => ({
  resolve: (
    _context: Record<string, unknown>,
    _path: string,
    request: string,
    _resolveContext: Record<string, unknown>,
    callback: (error?: Error | null, result?: string) => void
  ): void => {
    if (resolvableRequests.includes(request)) {
      callback(null, request)
      return
    }

    callback(new Error(`Cannot resolve ${request}`))
  },
})

type BeforeResolveCallback = (error?: Error | null, result?: false) => void

type BeforeResolve = (
  resolveData: {
    context: string
    dependencyType?: string
    request: string
    resolveOptions?: Record<string, unknown>
  },
  callback: BeforeResolveCallback
) => void

const runBeforeResolve = async (
  beforeResolve: BeforeResolve,
  resolveData: {
    context: string
    dependencyType?: string
    request: string
    resolveOptions?: Record<string, unknown>
  }
): Promise<false | undefined> =>
  new Promise((resolve, reject) => {
    beforeResolve(resolveData, (error, result) => {
      if (error) {
        reject(error)
        return
      }

      resolve(result)
    })
  })

type FakeNormalModuleFactory = {
  getResolver: (
    type: 'normal',
    options?: Record<string, unknown>
  ) => ReturnType<typeof createResolver>
  hooks: {
    beforeResolve: {
      tapAsync: (name: string, callback: BeforeResolve) => void
    }
  }
}

test('should parse package names from import requests', () => {
  assert.equal(getPackageNameFromRequest('@nestjs/websockets/socket-module'), '@nestjs/websockets')
  assert.equal(getPackageNameFromRequest('kafkajs'), 'kafkajs')
  assert.equal(getPackageNameFromRequest('mariadb/callback'), 'mariadb')
  assert.equal(getPackageNameFromRequest('./local-module'), null)
})

test('should parse issuer package names from nested contexts', () => {
  assert.equal(
    getPackageNameFromContext(
      '/repo/.yarn/cache/pkg.zip/node_modules/@nestjs/microservices/client'
    ),
    '@nestjs/microservices'
  )
  assert.equal(getPackageNameFromContext('/repo/node_modules/typeorm/driver'), 'typeorm')
  assert.equal(getPackageNameFromContext('/repo/app/src'), null)
})

test('should find issuer package manifest from nested context', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webpack-ignore-'))
  const packagePath = join(root, 'node_modules', '@nestjs', 'microservices')
  const context = join(packagePath, 'client')

  await writeManifest(packagePath, { name: '@nestjs/microservices' })
  await mkdir(context, { recursive: true })

  assert.equal(findPackageManifestPath(context), join(packagePath, 'package.json'))
})

test('should prefer issuer root package manifest over nested package manifests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webpack-ignore-'))
  const packagePath = join(root, 'node_modules', 'framework')
  const context = join(packagePath, 'dist', 'cjs')

  await writeManifest(packagePath, {
    name: 'framework',
    optionalDependencies: {
      'missing-driver': '*',
    },
  })
  await writeManifest(context, { type: 'commonjs' })

  assert.equal(findPackageManifestPath(context), join(packagePath, 'package.json'))
  assert.equal(isOptionalImport('missing-driver', context), true)
})

test('should ignore missing optional peer imports from issuer package metadata', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webpack-ignore-'))
  const packagePath = join(root, 'node_modules', '@nestjs', 'microservices')
  const context = join(packagePath, 'client')

  await writeManifest(packagePath, {
    name: '@nestjs/microservices',
    peerDependencies: {
      '@nestjs/core': '^10.0.0',
      '@nestjs/websockets': '^10.0.0',
      kafkajs: '*',
    },
    peerDependenciesMeta: {
      '@nestjs/websockets': {
        optional: true,
      },
      kafkajs: {
        optional: true,
      },
    },
  })
  await mkdir(context, { recursive: true })

  assert.equal(isOptionalImport('@nestjs/websockets', context), true)
  assert.equal(isOptionalImport('kafkajs', context), true)
  assert.equal(isOptionalImport('@nestjs/core', context), false)
})

test('should not ignore the same missing import from workspace source context', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webpack-ignore-'))
  const workspacePath = join(root, 'app')
  const context = join(workspacePath, 'src')

  await writeManifest(workspacePath, { name: '@app/service' })
  await mkdir(context, { recursive: true })

  assert.equal(isOptionalImport('@nestjs/websockets', context), false)
})

test('should not ignore optional peer imports from workspace source context', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webpack-ignore-'))
  const workspacePath = join(root, 'app')
  const context = join(workspacePath, 'src')

  await writeManifest(workspacePath, {
    name: '@app/service',
    peerDependencies: {
      '@nestjs/websockets': '^10.0.0',
    },
    peerDependenciesMeta: {
      '@nestjs/websockets': {
        optional: true,
      },
    },
  })
  await mkdir(context, { recursive: true })

  assert.equal(
    await shouldIgnoreOptionalImport('@nestjs/websockets', context, createResolver([])),
    false
  )
})

test('should keep scoped compatibility imports for packages with incomplete metadata', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webpack-ignore-'))
  const packagePath = join(root, 'node_modules', 'typeorm')
  const context = join(packagePath, 'driver')

  await writeManifest(packagePath, { name: 'typeorm' })
  await mkdir(context, { recursive: true })

  assert.equal(isOptionalImport('mariadb/callback', context), true)
  assert.equal(isOptionalImport('not-a-driver', context), false)
})

test('should keep legacy Terminus optional integration imports scoped to Terminus', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webpack-ignore-'))
  const packagePath = join(root, 'node_modules', '@nestjs', 'terminus')
  const context = join(packagePath, 'dist')

  await writeManifest(packagePath, { name: '@nestjs/terminus' })
  await mkdir(context, { recursive: true })

  assert.equal(isOptionalImport('@nestjs/mongoose', context), true)
  assert.equal(isOptionalImport('@nestjs/typeorm/dist/common/typeorm.utils', context), true)
  assert.equal(isOptionalImport('@nestjs/sequelize/dist/common/sequelize.utils', context), true)
  assert.equal(isOptionalImport('@nestjs/websockets', context), false)
})

test('should not ignore optional dependencies resolvable from issuer context', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webpack-ignore-'))
  const packagePath = join(root, 'node_modules', 'framework')
  const context = join(packagePath, 'dist')

  await writeManifest(packagePath, {
    name: 'framework',
    optionalDependencies: {
      'missing-driver': '*',
      'optional-driver': '*',
    },
  })
  await mkdir(context, { recursive: true })

  assert.equal(
    await shouldIgnoreOptionalImport(
      'optional-driver',
      context,
      createResolver(['optional-driver'])
    ),
    false
  )
  assert.equal(
    await shouldIgnoreOptionalImport('missing-driver', context, createResolver([])),
    true
  )
})

test('should pass dependency type into the webpack resolver before ignoring imports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'webpack-ignore-'))
  const packagePath = join(root, 'node_modules', 'framework')
  const context = join(packagePath, 'dist')
  const resolveOptions: Array<Record<string, unknown> | undefined> = []

  await writeManifest(packagePath, {
    name: 'framework',
    optionalDependencies: {
      'missing-driver': '*',
    },
  })
  await mkdir(context, { recursive: true })

  const callbacks: Array<BeforeResolve> = []
  const plugin = createOptionalImportIgnorePlugin('production')

  plugin.apply({
    hooks: {
      normalModuleFactory: {
        tap: (
          _name: string,
          callback: (normalModuleFactory: FakeNormalModuleFactory) => void
        ): void => {
          callback({
            getResolver: (_type: 'normal', options?: Record<string, unknown>) => {
              resolveOptions.push(options)

              return createResolver([])
            },
            hooks: {
              beforeResolve: {
                tapAsync: (_hookName: string, beforeResolve: BeforeResolve): void => {
                  callbacks.push(beforeResolve)
                },
              },
            },
          })
        },
      },
    },
  } as never)

  const [beforeResolve] = callbacks

  assert.equal(
    await runBeforeResolve(beforeResolve, {
      context,
      dependencyType: 'commonjs',
      request: 'missing-driver',
      resolveOptions: {
        extensions: ['.tsx', '.ts', '.js'],
      },
    }),
    false
  )
  assert.deepEqual(resolveOptions.at(0), {
    dependencyType: 'commonjs',
    extensions: ['.tsx', '.ts', '.js'],
  })
})
