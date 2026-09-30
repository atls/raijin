import type { Workspace }         from '@yarnpkg/core'

import type { RawManifest }       from '../before-workspace-packing.js'

import assert                     from 'node:assert/strict'
import { mkdir }                  from 'node:fs/promises'
import { mkdtemp }                from 'node:fs/promises'
import { rm }                     from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { join }                   from 'node:path'
import { test }                   from 'node:test'

import { npath }                  from '@yarnpkg/fslib'

import { beforeWorkspacePacking } from '../before-workspace-packing.js'

const createWorkspace = (cwd: string, isPrivate: boolean, build?: string): Workspace =>
  ({
    cwd: npath.toPortablePath(cwd),
    manifest: {
      private: isPrivate,
      scripts: new Map(build ? [['build', build]] : []),
    },
  }) as Workspace

const createArtifact = async (cwd: string, target: string): Promise<void> => {
  await mkdir(join(cwd, target), { recursive: true })
  await writeFile(join(cwd, target, 'index.js'), 'export const value = true\n')
  await writeFile(join(cwd, target, 'index.d.ts'), 'export declare const value: true\n')
}

test('applies publish metadata after consuming a completed library artifact', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-'))
  const manifest: RawManifest = {
    exports: { '.': './src/index.ts' },
    publishConfig: {
      exports: {
        '.': {
          import: './lib/index.js',
          types: './lib/index.d.ts',
        },
        './features/*': {
          import: './lib/features/*.js',
          types: './lib/features/*.d.ts',
        },
      },
    },
  }

  t.after(async () => rm(cwd, { force: true, recursive: true }))
  await createArtifact(cwd, 'lib')
  await beforeWorkspacePacking(
    createWorkspace(cwd, true, 'yarn library build --target ./lib'),
    manifest
  )

  assert.deepEqual(manifest.exports, manifest.publishConfig?.exports)
})

test('rejects library packing without a completed artifact', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-incomplete-'))
  const manifest: RawManifest = {
    exports: { '.': './src/index.ts' },
    publishConfig: {
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
      },
    },
  }

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  await assert.rejects(
    beforeWorkspacePacking(createWorkspace(cwd, true, 'yarn library build'), manifest),
    /Library artifact is incomplete/u
  )
  assert.deepEqual(manifest.exports, { '.': './src/index.ts' })
})
