import type { TypecheckResult } from './typecheck.js'

import assert                    from 'node:assert/strict'
import { mkdir }                 from 'node:fs/promises'
import { mkdtemp }               from 'node:fs/promises'
import { rm }                    from 'node:fs/promises'
import { writeFile }             from 'node:fs/promises'
import { tmpdir }                from 'node:os'
import { join }                  from 'node:path'
import { test }                  from 'node:test'

import { createCommandInput }    from '@atls/raijin/commands'
import { toPortableCwd }         from '@atls/raijin/commands'
import { ts }                    from '@atls/raijin/typescript'

import { typecheckProjectSources } from './typecheck.js'

type CompletedResult = Extract<TypecheckResult, { kind: 'completed' }>

const assertCompleted: (result: TypecheckResult) => asserts result is CompletedResult = (
  result
) => {
  assert.equal(result.kind, 'completed')
}

const createProject = async (files: Record<string, string>): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-outcome-'))

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await Promise.all(
    Object.entries(files).map(async ([path, source]) => {
      const file = join(cwd, path)

      await mkdir(join(file, '..'), { recursive: true })
      await writeFile(file, source)
    })
  )

  return cwd
}

const hasDiagnostic = (
  result: CompletedResult,
  code: number,
  fileSuffix?: string
): boolean =>
  result.diagnostics.some(
    (diagnostic) =>
      diagnostic.code === code &&
      (fileSuffix === undefined || diagnostic.file?.fileName.endsWith(fileSuffix) === true)
  )

const createPolicySolution = async (): Promise<string> =>
  createProject({
    'tsconfig.json': '{"files":[],"references":[{"path":"./packages/app"}]}\n',
    'packages/app/tsconfig.json': JSON.stringify({
      compilerOptions: { composite: true, skipLibCheck: true },
      files: ['types/broken.d.ts'],
      references: [{ path: '../lib' }],
    }),
    'packages/app/types/broken.d.ts':
      'export declare const appValue: AppMissingType\n',
    'packages/lib/tsconfig.json': JSON.stringify({
      compilerOptions: { composite: true, skipLibCheck: false },
      files: ['types/broken.d.ts'],
    }),
    'packages/lib/types/broken.d.ts':
      'export declare const libValue: LibMissingType\n',
  })

test('dispatches project diagnostics into a completed result', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"files":["index.ts"]}\n',
    'index.ts': 'export const value: string = 1\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })

  assertCompleted(result)
  assert.equal(result.exitCode, 1)
  assert.equal(hasDiagnostic(result, 2322, '/index.ts'), true)
})

test('dispatches positional files without requiring a project', async (t) => {
  const cwd = await createProject({ 'selected.ts': 'export const value = true\n' })
  const targets = createCommandInput({
    cwd: toPortableCwd(cwd),
    source: 'explicit',
    targets: ['selected.ts'],
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd, targets })

  assertCompleted(result)
  assert.equal(result.exitCode, 0)
  assert.deepEqual(result.diagnostics, [])
})

test('preserves configured skipLibCheck when manifest policy is absent', async (t) => {
  const cwd = await createPolicySolution()

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })

  assertCompleted(result)
  assert.equal(hasDiagnostic(result, 2304, '/packages/app/types/broken.d.ts'), false)
  assert.equal(hasDiagnostic(result, 2304, '/packages/lib/types/broken.d.ts'), true)
})

test('applies explicit true typecheckSkipLibCheck to every project', async (t) => {
  const cwd = await createPolicySolution()

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    manifestPolicySources: [{ cwd, typecheckSkipLibCheck: true }],
  })

  assertCompleted(result)
  assert.equal(result.exitCode, 0)
  assert.equal(hasDiagnostic(result, 2304), false)
})

test('uses the nearest explicit false typecheckSkipLibCheck policy', async (t) => {
  const cwd = await createPolicySolution()
  const workspaceCwd = join(cwd, 'packages/app')

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    manifestPolicySources: [
      { cwd, typecheckSkipLibCheck: true },
      { cwd: workspaceCwd, typecheckSkipLibCheck: false },
    ],
  })

  assertCompleted(result)
  assert.equal(hasDiagnostic(result, 2304, '/packages/app/types/broken.d.ts'), true)
  assert.equal(hasDiagnostic(result, 2304, '/packages/lib/types/broken.d.ts'), true)
})

test('returns a managed error for an invalid manifest policy', async () => {
  const cwd = '/workspace/package'
  const result = await typecheckProjectSources({
    cwd,
    manifestPolicySources: [{ cwd, typecheckSkipLibCheck: 'true' }],
  })

  assert.deepEqual(result, { kind: 'error', reason: 'invalid-policy', cwd })
})

test('returns a managed error when no root project exists', async (t) => {
  const cwd = await createProject({ 'index.ts': 'export const value = true\n' })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })

  assert.deepEqual(result, { kind: 'error', reason: 'missing-project', cwd })
})

test('propagates unexpected TypeScript provider failures', async (t) => {
  const cwd = await createProject({ 'index.ts': 'export const value = true\n' })

  t.after(async () => rm(cwd, { recursive: true, force: true }))
  t.mock.method(ts.sys, 'fileExists', () => {
    throw new Error('provider failed')
  })

  await assert.rejects(typecheckProjectSources({ cwd }), /provider failed/)
})
