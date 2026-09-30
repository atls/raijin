import type { TypecheckResult }    from '../interfaces/result.js'

import assert                      from 'node:assert/strict'
import { mkdir }                   from 'node:fs/promises'
import { mkdtemp }                 from 'node:fs/promises'
import { rm }                      from 'node:fs/promises'
import { writeFile }               from 'node:fs/promises'
import { tmpdir }                  from 'node:os'
import { join }                    from 'node:path'
import { test }                    from 'node:test'

import { ts }                      from '@atls/raijin/typescript'

import { typecheckProjectSources } from '../typecheck.js'

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

const hasDiagnostic = (result: CompletedResult, code: number, fileSuffix?: string): boolean =>
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
    'packages/app/types/broken.d.ts': 'export declare const appValue: AppMissingType\n',
    'packages/lib/tsconfig.json': JSON.stringify({
      compilerOptions: { composite: true, skipLibCheck: false },
      files: ['types/broken.d.ts'],
    }),
    'packages/lib/types/broken.d.ts': 'export declare const libValue: LibMissingType\n',
  })

test('returns completed project diagnostics with one exit code', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"files":["index.ts"]}\n',
    'index.ts': 'export const value: string = 1\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ kind: 'project', cwd, projectCwd: cwd })

  assertCompleted(result)
  assert.equal(result.exitCode, 1)
  assert.equal(hasDiagnostic(result, 2322, '/index.ts'), true)
})

test('preserves each referenced project skipLibCheck when policy is absent', async (t) => {
  const cwd = await createPolicySolution()

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ kind: 'project', cwd, projectCwd: cwd })

  assertCompleted(result)
  assert.equal(hasDiagnostic(result, 2304, '/packages/app/types/broken.d.ts'), false)
  assert.equal(hasDiagnostic(result, 2304, '/packages/lib/types/broken.d.ts'), true)
})

test('applies the nearest explicit project policy to every referenced project', async (t) => {
  const cwd = await createPolicySolution()
  const workspaceCwd = join(cwd, 'packages/app')

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    kind: 'project',
    cwd,
    projectCwd: cwd,
    manifestPolicySources: [
      { cwd, typecheckSkipLibCheck: false },
      { cwd: workspaceCwd, typecheckSkipLibCheck: true },
    ],
  })

  assertCompleted(result)
  assert.equal(result.exitCode, 0)
  assert.equal(hasDiagnostic(result, 2304), false)
})

test('applies absence, true, and false policy semantics in exact-file mode', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': JSON.stringify({
      compilerOptions: { skipLibCheck: true },
      files: ['types/broken.d.ts'],
    }),
    'types/broken.d.ts': 'export declare const value: MissingType\n',
  })
  const input = {
    kind: 'files',
    cwd,
    projectCwd: cwd,
    files: [join(cwd, 'types/broken.d.ts')],
  } as const

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const absent = await typecheckProjectSources(input)
  const explicitTrue = await typecheckProjectSources({
    ...input,
    manifestPolicySources: [{ cwd, typecheckSkipLibCheck: true }],
  })
  const explicitFalse = await typecheckProjectSources({
    ...input,
    manifestPolicySources: [{ cwd, typecheckSkipLibCheck: false }],
  })

  assertCompleted(absent)
  assertCompleted(explicitTrue)
  assertCompleted(explicitFalse)
  assert.equal(hasDiagnostic(absent, 2304), false)
  assert.equal(hasDiagnostic(explicitTrue, 2304), false)
  assert.equal(hasDiagnostic(explicitFalse, 2304, '/types/broken.d.ts'), true)
})

test('returns a managed error for invalid policy before provider work', async () => {
  const cwd = '/workspace/package'
  const result = await typecheckProjectSources({
    kind: 'files',
    cwd,
    projectCwd: cwd,
    files: ['/workspace/package/index.ts'],
    manifestPolicySources: [{ cwd, typecheckSkipLibCheck: 'true' }],
  })

  assert.deepEqual(result, { kind: 'error', reason: 'invalid-policy', cwd })
})

test('returns missing-project in both command modes', async (t) => {
  const cwd = await createProject({ 'index.ts': 'export const value = true\n' })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  assert.deepEqual(await typecheckProjectSources({ kind: 'project', cwd, projectCwd: cwd }), {
    kind: 'error',
    reason: 'missing-project',
    cwd,
  })
  assert.deepEqual(
    await typecheckProjectSources({
      kind: 'files',
      cwd,
      projectCwd: cwd,
      files: [join(cwd, 'index.ts')],
    }),
    { kind: 'error', reason: 'missing-project', cwd }
  )
})

test('propagates unexpected TypeScript provider failures', async (t) => {
  const cwd = await createProject({ 'index.ts': 'export const value = true\n' })

  t.after(async () => rm(cwd, { recursive: true, force: true }))
  t.mock.method(ts.sys, 'fileExists', () => {
    throw new Error('provider failed')
  })

  await assert.rejects(
    typecheckProjectSources({ kind: 'project', cwd, projectCwd: cwd }),
    /provider failed/
  )
})
