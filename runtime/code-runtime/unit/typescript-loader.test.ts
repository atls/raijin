import assert            from 'node:assert/strict'
import { mkdtemp }       from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import { test }          from 'node:test'
import { pathToFileURL } from 'node:url'

import { load }          from '../src/typescript-loader.js'

const createNextLoad = () =>
  (() => {
    throw new Error('Unexpected fallback loader call')
  }) as never

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
