import assert                 from 'node:assert/strict'
import { mkdir }              from 'node:fs/promises'
import { mkdtemp }            from 'node:fs/promises'
import { rm }                 from 'node:fs/promises'
import { writeFile }          from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
import { test }               from 'node:test'
import { pathToFileURL }      from 'node:url'

import { isPnpPackageSource } from './typescript-loader.js'
import { load }               from './typescript-loader.js'
import { resolve }            from './typescript-loader.js'

const createNextLoad = () =>
  (() => {
    throw new Error('Unexpected fallback loader call')
  }) as never

const createModuleNotFoundError = (message: string): Error & { code: string } =>
  Object.assign(new Error(message), { code: 'ERR_MODULE_NOT_FOUND' })

test('should resolve js specifier to ts source when physical virtual path is unavailable', async () => {
  const parentURL = pathToFileURL('/virtual/workspace/src/index.ts').href
  const attemptedSpecifiers: Array<string> = []

  const result = await resolve(
    './dependency.js',
    { parentURL } as never,
    ((specifier: string) => {
      attemptedSpecifiers.push(specifier)

      if (specifier === './dependency.ts') {
        return { shortCircuit: true, url: 'file:///workspace/src/dependency.ts' }
      }

      throw new Error(`Cannot resolve ${specifier}`)
    }) as never
  )

  assert.deepEqual(attemptedSpecifiers, ['./dependency.ts'])
  assert.equal(result.url, 'file:///workspace/src/dependency.ts')
})

test('should resolve extensionless relative specifier to tsx source', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'typescript-loader-'))
  const sourceDir = join(workspace, 'src')
  const parentPath = join(sourceDir, 'index.ts')
  const pagePath = join(sourceDir, 'page.tsx')

  try {
    await mkdir(sourceDir, { recursive: true })
    await writeFile(join(workspace, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8')
    await writeFile(parentPath, `import Page from './page'\nexport { Page }\n`, 'utf-8')
    await writeFile(pagePath, `export default function Page() { return null }\n`, 'utf-8')

    const result = await resolve(
      './page',
      { parentURL: pathToFileURL(parentPath).href } as never,
      createNextLoad()
    )

    assert.equal(result.url, pathToFileURL(pagePath).href)
  } finally {
    await rm(workspace, { recursive: true, force: true, maxRetries: 3 })
  }
})

test('should resolve package subpath through package manager fallback', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'typescript-loader-'))
  const sourceDir = join(workspace, 'src')
  const packageDir = join(workspace, 'node_modules/fixture')
  const parentPath = join(sourceDir, 'index.ts')
  const subpath = join(packageDir, 'image.js')

  try {
    await mkdir(sourceDir, { recursive: true })
    await mkdir(packageDir, { recursive: true })
    await writeFile(join(workspace, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8')
    await writeFile(join(packageDir, 'package.json'), JSON.stringify({ name: 'fixture' }), 'utf-8')
    await writeFile(parentPath, `import image from 'fixture/image'\nexport { image }\n`, 'utf-8')
    await writeFile(subpath, `module.exports = true\n`, 'utf-8')

    const result = await resolve(
      'fixture/image',
      { parentURL: pathToFileURL(parentPath).href } as never,
      (() => {
        throw createModuleNotFoundError('Cannot resolve fixture/image')
      }) as never
    )

    assert.match(result.url, /\/node_modules\/fixture\/image\.js$/)
  } finally {
    await rm(workspace, { recursive: true, force: true, maxRetries: 3 })
  }
})

test('should not resolve package subpath fallback for export condition errors', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'typescript-loader-'))
  const sourceDir = join(workspace, 'src')
  const packageDir = join(workspace, 'node_modules/fixture')
  const parentPath = join(sourceDir, 'index.ts')

  try {
    await mkdir(sourceDir, { recursive: true })
    await mkdir(packageDir, { recursive: true })
    await writeFile(join(workspace, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8')
    await writeFile(
      join(packageDir, 'package.json'),
      JSON.stringify({
        name: 'fixture',
        exports: {
          '.': {
            require: './cjs.js',
          },
        },
      }),
      'utf-8'
    )
    await writeFile(parentPath, `import fixture from 'fixture'\nexport { fixture }\n`, 'utf-8')
    await writeFile(join(packageDir, 'cjs.js'), `module.exports = true\n`, 'utf-8')

    const error = Object.assign(new Error('Package path is not exported'), {
      code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
    })

    await assert.rejects(
      async () =>
        resolve(
          'fixture',
          { parentURL: pathToFileURL(parentPath).href } as never,
          (() => {
            throw error
          }) as never
        ),
      (actual) => actual === error
    )
  } finally {
    await rm(workspace, { recursive: true, force: true, maxRetries: 3 })
  }
})

test('should not resolve cjs specifier to cts source', async () => {
  const parentURL = pathToFileURL('/virtual/workspace/src/index.ts').href

  await assert.rejects(
    async () =>
      resolve(
        './dependency.cjs',
        { parentURL } as never,
        ((specifier: string) => {
          throw new Error(`Cannot resolve ${specifier}`)
        }) as never
      ),
    /Cannot resolve \.\/dependency\.cjs/
  )
})

test('should preserve decorator metadata compiler options from tsconfig', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'typescript-loader-'))
  const sourcePath = join(workspace, 'service.ts')

  try {
    await writeFile(join(workspace, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8')
    await writeFile(
      join(workspace, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          emitDecoratorMetadata: true,
          experimentalDecorators: true,
        },
      }),
      'utf-8'
    )
    await writeFile(
      sourcePath,
      `
        const field = (): PropertyDecorator => () => undefined

        class Dependency {}

        class Service {
          @field()
          dependency!: Dependency
        }

        export { Service }
      `,
      'utf-8'
    )

    const result = await load(pathToFileURL(sourcePath).href, {} as never, createNextLoad())
    const output = String((result as { source: string }).source)

    assert.match(output, /__metadata\("design:type", Dependency\)/)
  } finally {
    await rm(workspace, { recursive: true, force: true, maxRetries: 3 })
  }
})

test('should reject TypeScript sources without ESM package boundary', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'typescript-loader-'))
  const sourcePath = join(workspace, 'service.ts')

  try {
    await writeFile(sourcePath, `export const service = true\n`, 'utf-8')

    await assert.rejects(
      async () => load(pathToFileURL(sourcePath).href, {} as never, createNextLoad()),
      /supports only ESM TypeScript sources/
    )
  } finally {
    await rm(workspace, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  }
})

test('should classify PnP package TypeScript sources as dependency boundary', () => {
  assert.equal(
    isPnpPackageSource(
      '/repo/.yarn/__virtual__/package-virtual/2/.yarn/berry/cache/package.zip/node_modules/package/sources/dependency.ts'
    ),
    true
  )

  assert.equal(isPnpPackageSource('/repo/yarn/plugin-tools/sources/dependency.ts'), false)
})

test('should reject TypeScript sources from CommonJS package boundary', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'typescript-loader-'))
  const sourcePath = join(workspace, 'service.ts')

  try {
    await writeFile(join(workspace, 'package.json'), JSON.stringify({ type: 'commonjs' }), 'utf-8')
    await writeFile(sourcePath, `export const service = true\n`, 'utf-8')

    await assert.rejects(
      async () => load(pathToFileURL(sourcePath).href, {} as never, createNextLoad()),
      /supports only ESM TypeScript sources/
    )
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
