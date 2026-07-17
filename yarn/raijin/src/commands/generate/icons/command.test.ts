import type { PortablePath }          from '@yarnpkg/fslib'

import assert                         from 'node:assert/strict'
import { mkdir }                      from 'node:fs/promises'
import { mkdtemp }                    from 'node:fs/promises'
import { writeFile }                  from 'node:fs/promises'
import { tmpdir }                     from 'node:os'
import { join }                       from 'node:path'
import { test }                       from 'node:test'

import { npath }                      from '@yarnpkg/fslib'

import { toCommandArguments }         from '@atls/raijin/commands/input'

import { createGeneratedIconInput }   from './command.js'
import { discoverGeneratedIconFiles } from './command.js'

test('should represent generated icon targets from workspace cwd', () => {
  const projectCwd = '/tmp/raijin-project' as PortablePath
  const workspaceCwd = '/tmp/raijin-project/packages/ui' as PortablePath
  const input = createGeneratedIconInput(workspaceCwd, ['Icon.tsx'])

  assert.equal(input.source, 'generated')
  assert.deepEqual(toCommandArguments(input, projectCwd), ['packages/ui/src/Icon.tsx'])
})

test('should discover generated icons from the workspace source directory', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-icons-'))

  await mkdir(join(cwd, 'src'))
  await mkdir(join(cwd, 'src', 'nested'))
  await writeFile(join(cwd, 'src', 'IconB.tsx'), 'export const IconB = null\n')
  await writeFile(join(cwd, 'src', 'IconA.tsx'), 'export const IconA = null\n')
  await writeFile(join(cwd, 'src', 'types.ts'), 'export type Icon = string\n')
  await writeFile(join(cwd, 'src', 'nested', 'Nested.tsx'), 'export const Nested = null\n')

  assert.deepEqual(await discoverGeneratedIconFiles(npath.toPortablePath(cwd)), [
    'IconA.tsx',
    'IconB.tsx',
  ])
})
