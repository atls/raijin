import assert            from 'node:assert/strict'
import { mkdtemp }       from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import { test }          from 'node:test'
import { pathToFileURL } from 'node:url'

import { load }          from './typescript-loader.js'
import { resolve }       from './typescript-loader.js'

const createNextLoad = () =>
  (() => {
    throw new Error('Unexpected fallback loader call')
  }) as never

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
    await rm(workspace, { recursive: true, force: true })
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
    await rm(workspace, { recursive: true, force: true })
  }
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
