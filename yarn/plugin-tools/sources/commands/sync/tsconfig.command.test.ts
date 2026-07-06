import assert                        from 'node:assert/strict'
import test                          from 'node:test'

import { npath }                     from '@yarnpkg/fslib'

import { createTSConfigSyncTarget }  from './tsconfig.command.js'
import { getTSConfigIncludeEntries } from './tsconfig.command.js'
import { mergeTSCompilerOptions }    from './tsconfig.command.js'
import { projectTypesReference }     from './tsconfig.command.js'

test('should point generated project types to public Raijin package', () => {
  assert.equal(projectTypesReference, '/// <reference types="@atls/raijin/types" />\n')
})

test('should keep tsconfig sync target at the project root workspace', () => {
  const projectRoot = npath.toPortablePath('/repo')
  const target = createTSConfigSyncTarget({
    topLevelWorkspace: {
      cwd: projectRoot,
      manifest: {
        raw: {
          workspaces: ['packages/*', 'apps/**/*'],
        },
      },
    },
  })

  assert.deepEqual(target, {
    cwd: projectRoot,
    workspaces: ['packages/*', 'apps/**/*'],
  })
})

test('should preserve implicit include when tsconfig include is missing', () => {
  assert.deepEqual(getTSConfigIncludeEntries({}, []), ['project.types.d.ts', '**/*'])
})

test('should preserve existing include entries and workspace includes', () => {
  assert.deepEqual(getTSConfigIncludeEntries({ include: ['src/**/*'] }, ['packages/**/*']), [
    'project.types.d.ts',
    'src/**/*',
    'packages/**/*',
  ])
})

test('should preserve project-specific module resolution options', () => {
  assert.deepEqual(
    mergeTSCompilerOptions(
      {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
      },
      {
        module: 'esnext',
        moduleResolution: 'bundler',
      }
    ),
    {
      module: 'esnext',
      moduleResolution: 'bundler',
      strict: true,
    }
  )
})

test('should not create include for file-only tsconfig', () => {
  assert.equal(getTSConfigIncludeEntries({ files: ['src/index.ts'] }, []), undefined)
})

test('should not create include for solution tsconfig with empty files', () => {
  assert.equal(getTSConfigIncludeEntries({ files: [] }, []), undefined)
})

test('should not create include when tsconfig inherits scope from extends', () => {
  assert.equal(getTSConfigIncludeEntries({ extends: './tsconfig.base.json' }, []), undefined)
})
