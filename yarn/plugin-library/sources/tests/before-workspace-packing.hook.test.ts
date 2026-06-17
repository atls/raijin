import type { Workspace }         from '@yarnpkg/core'

import type { RawManifest }       from '../before-workspace-packing.hook.js'

import assert                     from 'node:assert/strict'
import { test }                   from 'node:test'

import { beforeWorkspacePacking } from '../before-workspace-packing.hook.js'

const createWorkspace = (isPrivate: boolean): Workspace =>
  ({
    manifest: {
      private: isPrivate,
    },
  }) as Workspace

test('should apply raijin pack metadata for private workspaces', () => {
  const manifest: RawManifest = {
    exports: {
      '.': './sources/index.ts',
    },
    main: 'sources/index.ts',
    raijin: {
      pack: {
        exports: {
          '.': {
            import: './dist/index.js',
            types: './dist/index.d.ts',
            default: './dist/index.js',
          },
        },
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
      },
    },
  }

  beforeWorkspacePacking(createWorkspace(true), manifest)

  assert.deepEqual(manifest, {
    exports: {
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts',
        default: './dist/index.js',
      },
    },
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
  })
})

test('should keep publishConfig metadata for public workspaces', () => {
  const manifest: RawManifest = {
    exports: {
      '.': './sources/index.ts',
    },
    publishConfig: {
      exports: {
        '.': './dist/index.js',
      },
      main: 'dist/index.js',
    },
  }

  beforeWorkspacePacking(createWorkspace(false), manifest)

  assert.deepEqual(manifest, {
    exports: {
      '.': './dist/index.js',
    },
    main: 'dist/index.js',
    publishConfig: {
      exports: {
        '.': './dist/index.js',
      },
      main: 'dist/index.js',
    },
  })
})

test('should ignore publishConfig metadata for private workspaces', () => {
  const manifest: RawManifest = {
    exports: {
      '.': './sources/index.ts',
    },
    publishConfig: {
      exports: {
        '.': './dist/index.js',
      },
      main: 'dist/index.js',
    },
  }

  beforeWorkspacePacking(createWorkspace(true), manifest)

  assert.deepEqual(manifest, {
    exports: {
      '.': './sources/index.ts',
    },
    publishConfig: {
      exports: {
        '.': './dist/index.js',
      },
      main: 'dist/index.js',
    },
  })
})
