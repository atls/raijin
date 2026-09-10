import type { Workspace }         from '@yarnpkg/core'

import type { RawManifest }       from '../hook.js'

import assert                     from 'node:assert/strict'
import { mkdir }                  from 'node:fs/promises'
import { mkdtemp }                from 'node:fs/promises'
import { rm }                     from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { join }                   from 'node:path'
import { test }                   from 'node:test'

import { npath }                  from '@yarnpkg/fslib'

import { beforeWorkspacePacking } from '../hook.js'

const createWorkspace = (cwd: string, isPrivate: boolean, build?: string): Workspace =>
  ({
    cwd: npath.toPortablePath(cwd),
    manifest: {
      private: isPrivate,
      scripts: new Map(build ? [['build', build]] : []),
    },
  }) as Workspace

const createArtifact = async (cwd: string, target = 'dist'): Promise<void> => {
  await mkdir(join(cwd, target), { recursive: true })
  await writeFile(join(cwd, target, 'index.js'), 'export const value = true\n')
  await writeFile(join(cwd, target, 'index.d.ts'), 'export declare const value = true\n')
}

test('applies private plugin pack metadata without requiring a library artifact', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-private-'))
  const manifest: RawManifest = {
    exports: { '.': './src/index.ts' },
    main: './src/index.ts',
    raijin: {
      pack: {
        exports: {
          '.': {
            default: './dist/index.js',
            import: './dist/index.js',
            types: './dist/index.d.ts',
          },
        },
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
      },
    },
  }

  t.after(async () => rm(cwd, { force: true, recursive: true }))
  await beforeWorkspacePacking(createWorkspace(cwd, true, 'builder build plugin'), manifest)

  assert.deepEqual(manifest, {
    exports: {
      '.': {
        default: './dist/index.js',
        import: './dist/index.js',
        types: './dist/index.d.ts',
      },
    },
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
  })
})

test('applies publish metadata after consuming a private library artifact', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-public-'))
  const manifest: RawManifest = {
    exports: { '.': './src/index.ts' },
    publishConfig: {
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
      },
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
    },
  }

  t.after(async () => rm(cwd, { force: true, recursive: true }))
  await createArtifact(cwd)
  await beforeWorkspacePacking(createWorkspace(cwd, true, 'yarn library build'), manifest)

  assert.deepEqual(manifest, {
    exports: {
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts',
      },
    },
    main: 'dist/index.js',
    publishConfig: {
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
      },
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
    },
    types: 'dist/index.d.ts',
  })
})

test('recognizes a private library build with command arguments', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-arguments-'))
  const manifest: RawManifest = {
    exports: { '.': './src/index.ts' },
    publishConfig: {
      exports: {
        '.': {
          import: './lib/index.js',
          types: './lib/index.d.ts',
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

test('does not classify near-match or chained scripts as library builds', async (t) => {
  const scripts = ['yarn library builder', 'yarn library build && yarn other']

  await Promise.all(
    scripts.map(async (script) => {
      const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-other-script-'))
      const manifest: RawManifest = {
        exports: { '.': './src/index.ts' },
        publishConfig: { exports: { '.': './dist/index.js' } },
      }

      t.after(async () => rm(cwd, { force: true, recursive: true }))
      await beforeWorkspacePacking(createWorkspace(cwd, true, script), manifest)

      assert.deepEqual(manifest.exports, { '.': './src/index.ts' })
    })
  )
})

test('verifies a completed artifact referenced only by exports', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-exports-only-'))
  const manifest: RawManifest = {
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
  await createArtifact(cwd)
  await beforeWorkspacePacking(createWorkspace(cwd, true, 'yarn library build'), manifest)

  assert.deepEqual(manifest.exports, manifest.publishConfig?.exports)
})

test('rejects a missing file referenced only by exports', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-missing-export-'))
  const manifest: RawManifest = {
    publishConfig: {
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
        './missing': './dist/missing.js',
      },
    },
  }

  t.after(async () => rm(cwd, { force: true, recursive: true }))
  await createArtifact(cwd)

  await assert.rejects(
    beforeWorkspacePacking(createWorkspace(cwd, true, 'yarn library build'), manifest),
    /ENOENT/
  )
})

test('rejects an incomplete artifact referenced only by exports', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-missing-artifact-'))
  const manifest: RawManifest = {
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
    /Library artifact is incomplete/
  )
})

test('allows an existing static type export outside the completed artifact root', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-static-types-'))
  const manifest: RawManifest = {
    publishConfig: {
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
        './types': './types/index.d.ts',
      },
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
    },
  }

  t.after(async () => rm(cwd, { force: true, recursive: true }))
  await createArtifact(cwd)
  await mkdir(join(cwd, 'types'), { recursive: true })
  await writeFile(join(cwd, 'types/index.d.ts'), 'export interface Configuration {}\n')
  await beforeWorkspacePacking(createWorkspace(cwd, false, 'yarn library build'), manifest)

  assert.deepEqual(manifest.exports, manifest.publishConfig?.exports)
})

test('rejects pack metadata when no complete artifact exists', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-missing-'))
  const manifest: RawManifest = {
    publishConfig: {
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
    },
  }

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  await assert.rejects(
    beforeWorkspacePacking(createWorkspace(cwd, true, 'yarn library build'), manifest),
    /Library artifact is incomplete/
  )
  assert.ok(manifest.publishConfig)
})

test('keeps public metadata out of a private workspace without a pack contract', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-pack-unconfigured-'))
  const manifest: RawManifest = {
    exports: { '.': './src/index.ts' },
    publishConfig: {
      exports: { '.': './dist/index.js' },
      main: 'dist/index.js',
    },
  }

  t.after(async () => rm(cwd, { force: true, recursive: true }))
  await beforeWorkspacePacking(createWorkspace(cwd, true), manifest)

  assert.deepEqual(manifest, {
    exports: { '.': './src/index.ts' },
    publishConfig: {
      exports: { '.': './dist/index.js' },
      main: 'dist/index.js',
    },
  })
})
