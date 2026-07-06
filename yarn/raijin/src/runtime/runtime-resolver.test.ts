import assert                        from 'node:assert/strict'
import { mkdir }                     from 'node:fs/promises'
import { mkdtemp }                   from 'node:fs/promises'
import { rm }                        from 'node:fs/promises'
import { writeFile }                 from 'node:fs/promises'
import { tmpdir }                    from 'node:os'
import { join }                      from 'node:path'
import test                          from 'node:test'

import { findRaijinPackageBoundary } from './runtime-resolver.js'
import { resolveRaijinRuntimeUrl }   from './runtime-resolver.js'

const createRuntimePackage = async (cwd: string): Promise<string> => {
  const runtime = join(cwd, 'node_modules/@atls/raijin')

  await mkdir(runtime, { recursive: true })
  await writeFile(
    join(runtime, 'package.json'),
    JSON.stringify({
      type: 'module',
      exports: {
        './runtime-exec-argv': './runtime-exec-argv.js',
      },
    })
  )
  await writeFile(join(runtime, 'runtime-exec-argv.js'), 'export const value = true\n')

  return runtime
}

test('should resolve runtime subpath from ancestor raijin package boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-runtime-resolver-'))
  const workspace = join(root, 'client', 'next-app')

  try {
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
    await createRuntimePackage(root)

    assert.equal(findRaijinPackageBoundary(workspace), root)
    assert.match(
      resolveRaijinRuntimeUrl(workspace, '@atls/raijin/runtime-exec-argv'),
      /\/node_modules\/@atls\/raijin\/runtime-exec-argv\.js$/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('should prefer direct workspace raijin package boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-runtime-resolver-'))
  const workspace = join(root, 'server', 'api')

  try {
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
    await writeFile(
      join(workspace, 'package.json'),
      JSON.stringify({
        type: 'module',
        dependencies: {
          '@atls/raijin': 'workspace:*',
        },
      })
    )
    await createRuntimePackage(workspace)

    assert.equal(findRaijinPackageBoundary(workspace), workspace)
    assert.match(
      resolveRaijinRuntimeUrl(workspace, '@atls/raijin/runtime-exec-argv'),
      /\/server\/api\/node_modules\/@atls\/raijin\/runtime-exec-argv\.js$/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
