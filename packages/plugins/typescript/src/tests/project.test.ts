import assert                      from 'node:assert/strict'
import { mkdir }                   from 'node:fs/promises'
import { mkdtemp }                 from 'node:fs/promises'
import { readdir }                 from 'node:fs/promises'
import { rm }                      from 'node:fs/promises'
import { writeFile }               from 'node:fs/promises'
import { tmpdir }                  from 'node:os'
import { join }                    from 'node:path'
import { test }                    from 'node:test'

import { typecheckProjectSources } from '../project.js'

const describeResult = (result: Awaited<ReturnType<typeof typecheckProjectSources>>): string =>
  JSON.stringify(
    result.status === 'completed'
      ? {
          status: result.status,
          diagnosticCodes: result.diagnostics.map(({ code }) => code),
          files: result.files,
          terminal: result.terminal,
        }
      : result,
    undefined,
    2
  )

const createProject = async (
  files: Record<string, string>,
  manifest: Record<string, unknown> = {}
): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-'))

  await writeFile(
    join(cwd, 'package.json'),
    `${JSON.stringify({ type: 'module', ...manifest }, null, 2)}\n`
  )

  await Promise.all(
    Object.entries(files).map(async ([path, source]) => {
      const target = join(cwd, path)

      await mkdir(join(target, '..'), { recursive: true })
      await writeFile(target, source)
    })
  )

  return cwd
}

const createReferencedSolution = async (
  manifest: Record<string, unknown>,
  skipLibCheck: { readonly app: boolean; readonly lib: boolean; readonly root: boolean }
): Promise<string> =>
  createProject(
    {
      'tsconfig.json': `${JSON.stringify({
        compilerOptions: { noUnusedLocals: false, skipLibCheck: skipLibCheck.root },
        files: [],
        references: [{ path: './packages/app' }],
      })}\n`,
      'packages/app/tsconfig.json': `${JSON.stringify({
        compilerOptions: {
          composite: true,
          noUnusedLocals: true,
          skipLibCheck: skipLibCheck.app,
        },
        files: ['src/index.ts', 'types/broken.d.ts'],
        references: [{ path: '../lib' }],
      })}\n`,
      'packages/app/src/index.ts': 'const unused = true\n\nexport {}\n',
      'packages/app/types/broken.d.ts': 'export declare const appValue: AppMissingType\n',
      'packages/lib/tsconfig.json': `${JSON.stringify({
        compilerOptions: {
          composite: true,
          noUnusedLocals: false,
          skipLibCheck: skipLibCheck.lib,
        },
        files: ['src/index.ts', 'types/broken.d.ts'],
      })}\n`,
      'packages/lib/src/index.ts': 'const unused = true\n\nexport {}\n',
      'packages/lib/types/broken.d.ts': 'export declare const libValue: LibMissingType\n',
    },
    manifest
  )

test('should typecheck project references without emitting artifacts', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"files":[],"references":[{"path":"./packages/app"}]}\n',
    'packages/app/tsconfig.json':
      '{"compilerOptions":{"composite":true,"outDir":"dist"},"include":["src/**/*.ts"]}\n',
    'packages/app/src/index.ts': 'export const value: string = 1\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })
  const files = await readdir(cwd, { recursive: true })

  assert.equal(result.status, 'completed', describeResult(result))
  assert.equal(
    result.diagnostics.some(({ code }) => code === 2322),
    true,
    describeResult(result)
  )
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'diagnostics' })
  assert.equal(
    files.some((file) => /(?:\.d\.ts|\.js|\.tsbuildinfo)$/.test(file)),
    false
  )
})

test('should keep an empty solution scoped to its declared references', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"files":[],"references":[{"path":"./packages/app"}]}\n',
    'packages/app/tsconfig.json':
      '{"compilerOptions":{"composite":true},"include":["src/**/*.ts"]}\n',
    'packages/app/src/index.ts': 'export const value = 1\n',
    'packages/unreferenced/src/broken.ts': 'export const broken = missing.value\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })

  assert.equal(result.status, 'completed', describeResult(result))
  assert.deepEqual(result.terminal, { exitCode: 0, reason: 'clean' })
  assert.equal(
    result.files.some((file) => file.includes('/packages/unreferenced/')),
    false
  )
})

test('should preserve per-project skipLibCheck when manifest policy is absent', async (t) => {
  const cwd = await createReferencedSolution({}, { root: true, app: false, lib: true })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })

  assert.equal(result.status, 'completed', describeResult(result))

  const diagnosticFiles = result.diagnostics
    .filter(({ code }) => code === 2304)
    .map(({ file }) => file?.fileName)

  assert.equal(
    diagnosticFiles.some((file) => file?.endsWith('/packages/app/types/broken.d.ts')),
    true,
    describeResult(result)
  )
  assert.equal(
    diagnosticFiles.some((file) => file?.endsWith('/packages/lib/types/broken.d.ts')),
    false,
    describeResult(result)
  )
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'diagnostics' })
})

test('should apply true manifest policy to every nested solution project', async (t) => {
  const cwd = await createReferencedSolution(
    { typecheckSkipLibCheck: true },
    { root: false, app: false, lib: false }
  )

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })

  assert.equal(result.status, 'completed', describeResult(result))

  assert.equal(
    result.diagnostics.some(({ code }) => code === 2304),
    false,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(
      ({ code, file }) => code === 6133 && file?.fileName.endsWith('/packages/app/src/index.ts')
    ),
    true,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(
      ({ code, file }) => code === 6133 && file?.fileName.endsWith('/packages/lib/src/index.ts')
    ),
    false,
    describeResult(result)
  )
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'diagnostics' })
})

test('should apply false manifest policy to every nested solution project', async (t) => {
  const cwd = await createReferencedSolution(
    { typecheckSkipLibCheck: false },
    { root: true, app: true, lib: true }
  )

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })

  assert.equal(result.status, 'completed', describeResult(result))

  const diagnosticFiles = result.diagnostics
    .filter(({ code }) => code === 2304)
    .map(({ file }) => file?.fileName)

  assert.equal(
    diagnosticFiles.some((file) => file?.endsWith('/packages/app/types/broken.d.ts')),
    true,
    describeResult(result)
  )
  assert.equal(
    diagnosticFiles.some((file) => file?.endsWith('/packages/lib/types/broken.d.ts')),
    true,
    describeResult(result)
  )
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'diagnostics' })
})

test('should preserve project options for explicit targets', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        module: 'esnext',
        moduleResolution: 'bundler',
      },
      include: ['src/**/*.ts'],
    }),
    'src/lib.ts': 'export const value = 1\n',
    'src/index.ts': "import { value } from './lib'\n\nexport { value }\n",
    'src/broken.ts': 'export const broken = missing.value\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd, targets: ['src/index.ts'] })

  assert.equal(result.status, 'completed', describeResult(result))
  assert.deepEqual(result.terminal, { exitCode: 0, reason: 'clean' })
  assert.equal(
    result.diagnostics.some(({ code }) => code === 2835),
    false
  )
  assert.equal(
    result.files.some((file) => file.endsWith('/src/broken.ts')),
    false
  )
})

test('should return diagnostics without path-based suppression', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': JSON.stringify({
      compilerOptions: { noUnusedLocals: true },
      include: ['src/**/*.ts'],
    }),
    'src/@yarnpkg/libui/index.ts': 'const unused = 1\n\nexport {}\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })

  assert.equal(result.status, 'completed', describeResult(result))
  assert.equal(
    result.diagnostics.some(({ code }) => code === 6133),
    true
  )
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'diagnostics' })
})

test('should return TypeScript empty-project diagnostics as a non-zero result', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"include":["src/**/*.ts"]}\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })

  assert.equal(result.status, 'completed', describeResult(result))
  assert.equal(
    result.diagnostics.some(({ code }) => code === 18003),
    true
  )
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'diagnostics' })
})

test('should return provider failures as structured terminal results', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-provider-'))

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd })

  assert.equal(result.status, 'provider-failed')
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'provider-failed' })
})
