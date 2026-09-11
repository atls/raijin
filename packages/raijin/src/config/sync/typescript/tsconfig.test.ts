import assert                             from 'node:assert/strict'
import { mkdtemp }                        from 'node:fs/promises'
import { readFile }                       from 'node:fs/promises'
import { writeFile }                      from 'node:fs/promises'
import { tmpdir }                         from 'node:os'
import { join }                           from 'node:path'
import test                               from 'node:test'

import { npath }                          from '@yarnpkg/fslib'

import { mergeTypeScriptCompilerOptions } from '../../typescript/index.js'
import { projectTypesReference }          from './tsconfig.js'
import { resolveTypeScriptIncludes }      from './tsconfig.js'
import { syncTypeScriptConfig }           from './tsconfig.js'

test('should point generated project types to public Raijin package', () => {
  assert.equal(projectTypesReference, '/// <reference types="@atls/raijin/types" />\n')
})

test('should preserve implicit include when tsconfig include is missing', () => {
  assert.deepEqual(resolveTypeScriptIncludes({}, []), ['project.types.d.ts', '**/*'])
})

test('should preserve existing include entries and workspace includes', () => {
  assert.deepEqual(resolveTypeScriptIncludes({ include: ['src/**/*'] }, ['packages/**/*']), [
    'project.types.d.ts',
    'src/**/*',
    'packages/**/*',
  ])
})

test('should preserve project-specific compiler options', () => {
  assert.deepEqual(
    mergeTypeScriptCompilerOptions(
      { module: 'NodeNext', moduleResolution: 'NodeNext', strict: true },
      { module: 'esnext', moduleResolution: 'bundler' }
    ),
    { module: 'esnext', moduleResolution: 'bundler', strict: true }
  )
})

test('should not create include for config-owned scopes', () => {
  assert.equal(resolveTypeScriptIncludes({ files: ['src/index.ts'] }, []), undefined)
  assert.equal(resolveTypeScriptIncludes({ files: [] }, []), undefined)
  assert.equal(resolveTypeScriptIncludes({ extends: './tsconfig.base.json' }, []), undefined)
})

test('should own tsconfig writes without replacing files scope', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typescript-sync-'))
  const configPath = join(cwd, 'tsconfig.json')

  await writeFile(configPath, '{"files":["src/index.ts"],"compilerOptions":{"strict":false}}\n')

  assert.equal(
    await syncTypeScriptConfig({
      cwd: npath.toPortablePath(cwd),
      workspacePatterns: ['packages/*'],
    }),
    true
  )

  const config = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>

  assert.deepEqual(config.files, ['src/index.ts'])
  assert.equal(Object.hasOwn(config, 'include'), false)
  assert.deepEqual((config.compilerOptions as Record<string, unknown>).strict, false)
  assert.equal(
    await readFile(join(cwd, 'project.types.d.ts'), 'utf8'),
    '/// <reference types="@atls/raijin/types" />\n'
  )
})
