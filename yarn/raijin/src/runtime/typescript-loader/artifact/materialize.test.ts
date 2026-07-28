import assert                                  from 'node:assert/strict'
import { mkdir }                               from 'node:fs/promises'
import { mkdtemp }                             from 'node:fs/promises'
import { readdir }                             from 'node:fs/promises'
import { rm }                                  from 'node:fs/promises'
import { writeFile }                           from 'node:fs/promises'
import { tmpdir }                              from 'node:os'
import { join }                                from 'node:path'
import test                                    from 'node:test'

import { materializeTypeScriptLoaderArtifact } from './materialize.js'

test('should reuse a content-addressed loader artifact', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'typescript-loader-artifact-'))
  const cachePath = join(workspace, 'cache')
  const sourcePath = join(workspace, 'src', 'runtime', 'typescript-loader.ts')
  const packagePath = join(workspace, 'package.json')

  try {
    await mkdir(join(workspace, 'src', 'runtime'), { recursive: true })
    await writeFile(packagePath, JSON.stringify({ type: 'module' }), 'utf8')
    await writeFile(
      sourcePath,
      `
        import type { LoadHook } from 'node:module'
        import { createRequire } from 'node:module'

        const require = createRequire(import.meta.url)

        export const resolvedPath = require.resolve('node:path')
        export const load: LoadHook = () => ({
          format: 'module',
          shortCircuit: true,
          source: 'export {}',
        })
      `,
      'utf8'
    )

    const [firstLoader, secondLoader] = await Promise.all([
      materializeTypeScriptLoaderArtifact({
        cachePath,
        packagePath,
        sourcePath,
      }),
      materializeTypeScriptLoaderArtifact({
        cachePath,
        packagePath,
        sourcePath,
      }),
    ])
    const artifactDirectories = (await readdir(cachePath)).filter(
      (entry) => !entry.startsWith('.materialize-')
    )

    assert.equal(firstLoader, secondLoader)
    assert.equal(artifactDirectories.length, 1)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('should materialize changed loader source as a new artifact', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'typescript-loader-artifact-'))
  const cachePath = join(workspace, 'cache')
  const sourcePath = join(workspace, 'src', 'runtime', 'typescript-loader.ts')
  const packagePath = join(workspace, 'package.json')

  try {
    await mkdir(join(workspace, 'src', 'runtime'), { recursive: true })
    await writeFile(packagePath, JSON.stringify({ type: 'module' }), 'utf8')
    await writeFile(
      sourcePath,
      `export const load = () => ({ format: 'module', shortCircuit: true, source: 'export const version = 1' })\n`,
      'utf8'
    )

    const firstLoader = await materializeTypeScriptLoaderArtifact({
      cachePath,
      packagePath,
      sourcePath,
    })

    await writeFile(
      sourcePath,
      `export const load = () => ({ format: 'module', shortCircuit: true, source: 'export const version = 2' })\n`,
      'utf8'
    )

    const secondLoader = await materializeTypeScriptLoaderArtifact({
      cachePath,
      packagePath,
      sourcePath,
    })

    assert.notEqual(firstLoader, secondLoader)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
