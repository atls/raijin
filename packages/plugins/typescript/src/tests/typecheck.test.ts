import type { TypecheckManifestPolicySource } from '../typecheck.js'
import type { TypecheckProjectResult }        from '../typecheck.js'
import type { TypecheckTarget }               from '../typecheck.js'

import assert                                 from 'node:assert/strict'
import { mkdir }                              from 'node:fs/promises'
import { mkdtemp }                            from 'node:fs/promises'
import { readFile }                           from 'node:fs/promises'
import { readdir }                            from 'node:fs/promises'
import { rm }                                 from 'node:fs/promises'
import { writeFile }                          from 'node:fs/promises'
import { tmpdir }                             from 'node:os'
import { join }                               from 'node:path'
import { test }                               from 'node:test'

import { typecheckProjectSources }            from '../typecheck.js'

type CheckedResult = Extract<TypecheckProjectResult, { status: 'clean' | 'diagnostics' }>

const describeResult = (result: TypecheckProjectResult): string =>
  JSON.stringify(
    result.status === 'clean' || result.status === 'diagnostics'
      ? {
          status: result.status,
          diagnosticCodes: result.diagnostics.map(({ code }) => code),
          diagnosticFiles: result.diagnostics.map(({ file }) => file?.fileName),
          terminal: result.terminal,
        }
      : result,
    undefined,
    2
  )

const assertChecked: (result: TypecheckProjectResult) => asserts result is CheckedResult = (
  result
) => {
  assert.ok(result.status === 'clean' || result.status === 'diagnostics', describeResult(result))
}

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

const target = (cwd: string, request: string): TypecheckTarget => ({
  path: join(cwd, request),
  request,
})

const manifestPolicySource = (
  cwd: string,
  typecheckSkipLibCheck: unknown
): TypecheckManifestPolicySource => ({
  cwd,
  typecheckSkipLibCheck,
})

const readTree = async (cwd: string): Promise<Array<string>> =>
  (await readdir(cwd, { recursive: true })).sort()

const createReferencedSolution = async (skipLibCheck: {
  readonly app: boolean
  readonly lib: boolean
  readonly root: boolean
}): Promise<string> =>
  createProject({
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
  })

test('should typecheck the real reference graph without writing outputs', async (t) => {
  const outputSentinel = 'existing output sentinel\n'
  const cwd = await createProject({
    'tsconfig.json': '{"files":[],"references":[{"path":"./packages/app"}]}\n',
    'packages/app/tsconfig.json': JSON.stringify({
      compilerOptions: {
        composite: true,
        declaration: true,
        declarationMap: true,
        incremental: true,
        outDir: 'dist',
        sourceMap: true,
      },
      include: ['src/**/*.ts'],
    }),
    'packages/app/src/index.ts': 'export const value: string = 1\n',
    'packages/app/dist/index.js': outputSentinel,
  })
  const before = await readTree(cwd)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd, rootCwd: cwd })

  assertChecked(result)
  assert.equal(result.status, 'diagnostics', describeResult(result))
  assert.equal(
    result.diagnostics.some(({ code }) => code === 2322),
    true,
    describeResult(result)
  )
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'diagnostics' })
  assert.deepEqual(await readTree(cwd), before)
  assert.equal(await readFile(join(cwd, 'packages/app/dist/index.js'), 'utf8'), outputSentinel)
})

test('should keep whole-project checking inside the declared reference graph', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"files":[],"references":[{"path":"./packages/app"}]}\n',
    'packages/app/tsconfig.json':
      '{"compilerOptions":{"composite":true,"module":"esnext","moduleResolution":"bundler"},"include":["src/**/*.ts"],"references":[{"path":"../lib"}]}\n',
    'packages/app/src/index.ts':
      "import { lib } from '../../lib/dist/index.js'\n\nexport const app = lib\n",
    'packages/lib/tsconfig.json':
      '{"compilerOptions":{"composite":true,"rootDir":"src","outDir":"dist"},"include":["src/**/*.ts"]}\n',
    'packages/lib/src/index.ts': 'export const lib: string = true\n',
    'packages/unreferenced/tsconfig.json': '{"include":["src/**/*.ts"]}\n',
    'packages/unreferenced/src/broken.ts': 'export const broken = missing.value\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd, rootCwd: cwd })

  assertChecked(result)
  assert.equal(result.status, 'diagnostics', describeResult(result))
  assert.equal(
    result.diagnostics.some(
      ({ code, file }) => code === 2322 && file?.fileName.endsWith('/packages/lib/src/index.ts')
    ),
    true,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(({ file }) =>
      file?.fileName.endsWith('/packages/unreferenced/src/broken.ts')),
    false,
    describeResult(result)
  )
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'diagnostics' })
})

test('should check explicit targets through owning project configs and references', async (t) => {
  const cwd = await createProject({
    'tsconfig.json':
      '{"files":[],"references":[{"path":"./packages/app"},{"path":"./packages/other"}]}\n',
    'tsconfig.base.json': JSON.stringify({
      compilerOptions: {
        module: 'esnext',
        moduleResolution: 'bundler',
        noUnusedLocals: true,
      },
    }),
    'packages/app/tsconfig.json': JSON.stringify({
      extends: '../../tsconfig.base.json',
      compilerOptions: { composite: true },
      include: ['src/**/*.ts'],
      exclude: ['src/excluded.ts'],
      references: [{ path: '../lib' }],
    }),
    'packages/app/src/index.ts': 'const unused = true\n\nexport {}\n',
    'packages/app/src/broken.ts': 'export const broken = missing.value\n',
    'packages/app/src/excluded.ts': 'export const excluded = excludedMissing.value\n',
    'packages/lib/tsconfig.json':
      '{"compilerOptions":{"composite":true},"include":["src/**/*.ts"]}\n',
    'packages/lib/src/index.ts': 'export const lib: string = 1\n',
    'packages/other/tsconfig.json':
      '{"compilerOptions":{"composite":true},"include":["src/**/*.ts"]}\n',
    'packages/other/src/index.ts': 'export const other = otherMissing.value\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    rootCwd: cwd,
    targets: [target(cwd, 'packages/app/src/index.ts')],
  })

  assertChecked(result)
  assert.equal(result.status, 'diagnostics', describeResult(result))
  assert.equal(
    result.diagnostics.some(({ code }) => code === 6133),
    true,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(({ file }) => file?.fileName.endsWith('/packages/app/src/broken.ts')),
    true,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(({ file }) => file?.fileName.endsWith('/packages/lib/src/index.ts')),
    true,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(({ file }) => file?.fileName.endsWith('/packages/app/src/excluded.ts')),
    false,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(({ file }) => file?.fileName.endsWith('/packages/other/src/index.ts')),
    false,
    describeResult(result)
  )
})

test('should resolve an excluded target imported by a configured program', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': JSON.stringify({
      compilerOptions: { module: 'esnext', moduleResolution: 'bundler' },
      include: ['src/index.ts'],
      exclude: ['src/imported.ts'],
    }),
    'src/index.ts': "import { imported } from './imported.js'\n\nexport { imported }\n",
    'src/imported.ts': 'export const imported: string = 1\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    rootCwd: cwd,
    targets: [target(cwd, 'src/imported.ts')],
  })

  assertChecked(result)
  assert.equal(result.status, 'diagnostics', describeResult(result))
  assert.equal(
    result.diagnostics.some(
      ({ code, file }) => code === 2322 && file?.fileName.endsWith('/src/imported.ts')
    ),
    true,
    describeResult(result)
  )
})

test('should prefer a directly configured target owner over dependent programs', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': JSON.stringify({
      files: ['src/root.ts'],
      references: [{ path: './packages/app' }, { path: './packages/sibling' }],
    }),
    'src/root.ts': 'export const root = rootMissing.value\n',
    'packages/app/tsconfig.json': JSON.stringify({
      compilerOptions: { composite: true, module: 'esnext', moduleResolution: 'bundler' },
      files: ['src/index.ts', 'src/broken.ts'],
      references: [{ path: '../lib' }],
    }),
    'packages/app/src/index.ts': "import { lib } from '../../lib/src/index.js'\n\nexport { lib }\n",
    'packages/app/src/broken.ts': 'export const app = appMissing.value\n',
    'packages/lib/tsconfig.json':
      '{"compilerOptions":{"composite":true},"files":["src/index.ts"]}\n',
    'packages/lib/src/index.ts': 'export const lib: string = 1\n',
    'packages/sibling/tsconfig.json':
      '{"compilerOptions":{"composite":true},"files":["src/index.ts"]}\n',
    'packages/sibling/src/index.ts': 'export const sibling = siblingMissing.value\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    rootCwd: cwd,
    targets: [target(cwd, 'packages/lib/src/index.ts')],
  })

  assertChecked(result)
  assert.equal(result.status, 'diagnostics', describeResult(result))
  assert.equal(
    result.diagnostics.some(
      ({ code, file }) => code === 2322 && file?.fileName.endsWith('/packages/lib/src/index.ts')
    ),
    true,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(({ file }) =>
      ['/src/root.ts', '/packages/app/src/broken.ts', '/packages/sibling/src/index.ts'].some((
        path
      ) => file?.fileName.endsWith(path))),
    false,
    describeResult(result)
  )
})

test('should ignore config diagnostics outside an explicit target owner closure', async (t) => {
  const cwd = await createProject({
    'tsconfig.json':
      '{"files":[],"references":[{"path":"./packages/app"},{"path":"./packages/sibling"}]}\n',
    'packages/app/tsconfig.json':
      '{"compilerOptions":{"composite":true},"files":["src/index.ts"]}\n',
    'packages/app/src/index.ts': 'export const app = true\n',
    'packages/sibling/tsconfig.json': '{"compilerOptions":{"composite":true},"files":[]}\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    rootCwd: cwd,
    targets: [target(cwd, 'packages/app/src/index.ts')],
  })

  assertChecked(result)
  assert.equal(result.status, 'clean', describeResult(result))
  assert.equal(
    result.diagnostics.some(({ code }) => code === 18002),
    false,
    describeResult(result)
  )
})

test('should preserve recoverable root config diagnostics for explicit targets', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': JSON.stringify({
      compilerOptions: { module: 'not-a-module' },
      files: [],
      references: [{ path: './packages/app' }],
    }),
    'packages/app/tsconfig.json':
      '{"compilerOptions":{"composite":true},"files":["src/index.ts"]}\n',
    'packages/app/src/index.ts': 'export const app = true\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    rootCwd: cwd,
    targets: [target(cwd, 'packages/app/src/index.ts')],
  })

  assertChecked(result)
  assert.equal(result.status, 'diagnostics', describeResult(result))
  assert.equal(
    result.diagnostics.some(({ code }) => code === 6046),
    true,
    describeResult(result)
  )
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'diagnostics' })
})

test('should check every owner and each shared reference closure once', async (t) => {
  const cwd = await createProject({
    'tsconfig.json':
      '{"files":[],"references":[{"path":"./packages/app-a"},{"path":"./packages/app-b"}]}\n',
    'packages/shared.ts': 'export const shared = true\n',
    'packages/app-a/tsconfig.json': JSON.stringify({
      compilerOptions: { composite: true, noUnusedLocals: true, rootDir: '..' },
      files: ['../shared.ts', 'src/index.ts'],
      references: [{ path: '../lib' }],
    }),
    'packages/app-a/src/index.ts': 'const unused = true\n\nexport {}\n',
    'packages/app-b/tsconfig.json': JSON.stringify({
      compilerOptions: { composite: true, noImplicitAny: true, rootDir: '..' },
      files: ['../shared.ts', 'src/index.ts'],
      references: [{ path: '../lib' }],
    }),
    'packages/app-b/src/index.ts': 'export const value = (input) => input\n',
    'packages/lib/tsconfig.json':
      '{"compilerOptions":{"composite":true},"files":["src/index.ts"]}\n',
    'packages/lib/src/index.ts': 'export const lib: string = 1\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    rootCwd: cwd,
    targets: [target(cwd, 'packages/shared.ts')],
  })

  assertChecked(result)
  assert.equal(result.status, 'diagnostics', describeResult(result))
  assert.equal(
    result.diagnostics.some(({ file }) => file?.fileName.endsWith('/packages/app-a/src/index.ts')),
    true,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(({ file }) => file?.fileName.endsWith('/packages/app-b/src/index.ts')),
    true,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.filter(
      ({ code, file }) => code === 2322 && file?.fileName.endsWith('/packages/lib/src/index.ts')
    ).length,
    1,
    describeResult(result)
  )
})

test('should return configured targets without an owning project as unresolved', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"include":["src/**/*.ts"],"exclude":["src/excluded.ts"]}\n',
    'src/index.ts': 'export const value = true\n',
    'src/excluded.ts': 'export const excluded = true\n',
  })
  const excluded = target(cwd, 'src/excluded.ts')

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    rootCwd: cwd,
    targets: [excluded],
  })

  assert.equal(result.status, 'unresolved-target', describeResult(result))
  assert.deepEqual(result.targets, [excluded])
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'unresolved-target' })
})

test('should check exactly explicit files with native defaults when config is absent', async (t) => {
  const cwd = await createProject({
    'src/index.ts': 'export const value: string = 1\n',
    'src/unselected.ts': 'export const unselected = unselectedMissing.value\n',
  })
  const selected = target(cwd, 'src/index.ts')

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd, rootCwd: cwd, targets: [selected] })

  assertChecked(result)
  assert.equal(result.status, 'diagnostics', describeResult(result))
  assert.equal(
    result.diagnostics.some(({ code }) => code === 2322),
    true,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(({ file }) => file?.fileName.endsWith('/src/unselected.ts')),
    false,
    describeResult(result)
  )
})

test('should apply manifest skipLibCheck to exact files without a config', async (t) => {
  const skippedCwd = await createProject({
    'types/broken.d.ts': 'export declare const value: MissingType\n',
  })
  const checkedCwd = await createProject({
    'types/broken.d.ts': 'export declare const value: MissingType\n',
  })

  t.after(async () => {
    await Promise.all(
      [skippedCwd, checkedCwd].map(async (cwd) => rm(cwd, { recursive: true, force: true }))
    )
  })

  const skipped = await typecheckProjectSources({
    cwd: skippedCwd,
    manifestPolicySources: [manifestPolicySource(skippedCwd, true)],
    rootCwd: skippedCwd,
    targets: [target(skippedCwd, 'types/broken.d.ts')],
  })
  const checked = await typecheckProjectSources({
    cwd: checkedCwd,
    manifestPolicySources: [manifestPolicySource(checkedCwd, false)],
    rootCwd: checkedCwd,
    targets: [target(checkedCwd, 'types/broken.d.ts')],
  })

  assert.equal(skipped.status, 'clean', describeResult(skipped))
  assert.equal(checked.status, 'diagnostics', describeResult(checked))
})

test('should return missing-project when config and explicit files are absent', async (t) => {
  const cwd = await createProject({})

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd, rootCwd: cwd })

  assert.deepEqual(result, {
    status: 'missing-project',
    cwd,
    terminal: { exitCode: 1, reason: 'missing-project' },
  })
})

test('should expose native TypeScript empty-project diagnostics', async (t) => {
  const emptyFilesCwd = await createProject({ 'tsconfig.json': '{"files":[]}\n' })
  const emptyIncludeCwd = await createProject({
    'tsconfig.json': '{"include":["src/**/*.ts"]}\n',
  })

  t.after(async () => {
    await Promise.all(
      [emptyFilesCwd, emptyIncludeCwd].map(async (cwd) => rm(cwd, { recursive: true, force: true }))
    )
  })

  const emptyFiles = await typecheckProjectSources({ cwd: emptyFilesCwd, rootCwd: emptyFilesCwd })
  const emptyInclude = await typecheckProjectSources({
    cwd: emptyIncludeCwd,
    rootCwd: emptyIncludeCwd,
  })

  assertChecked(emptyFiles)
  assertChecked(emptyInclude)
  assert.equal(
    emptyFiles.diagnostics.some(({ code }) => code === 18002),
    true,
    describeResult(emptyFiles)
  )
  assert.equal(
    emptyInclude.diagnostics.some(({ code }) => code === 18003),
    true,
    describeResult(emptyInclude)
  )
  assert.deepEqual(emptyFiles.terminal, { exitCode: 1, reason: 'diagnostics' })
  assert.deepEqual(emptyInclude.terminal, { exitCode: 1, reason: 'diagnostics' })
})

test('should preserve per-project skipLibCheck when manifest policy is absent', async (t) => {
  const cwd = await createReferencedSolution({ root: true, app: false, lib: true })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({ cwd, rootCwd: cwd })

  assertChecked(result)

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
})

test('should apply true manifest policy to every project in the graph', async (t) => {
  const cwd = await createReferencedSolution({ root: false, app: false, lib: false })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    manifestPolicySources: [manifestPolicySource(cwd, true)],
    rootCwd: cwd,
  })

  assertChecked(result)
  assert.equal(
    result.diagnostics.some(({ code }) => code === 2304),
    false,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(({ code }) => code === 6133),
    true,
    describeResult(result)
  )
})

test('should apply false manifest policy to every project in the graph', async (t) => {
  const cwd = await createReferencedSolution({ root: true, app: true, lib: true })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    manifestPolicySources: [manifestPolicySource(cwd, false)],
    rootCwd: cwd,
  })

  assertChecked(result)

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
})

test('should ignore a workspace policy when the root owns the real config', async (t) => {
  const rootCwd = await createProject({
    'tsconfig.json': '{"compilerOptions":{"skipLibCheck":false},"include":["types/**/*.d.ts"]}\n',
    'types/broken.d.ts': 'export declare const value: MissingType\n',
  })
  const cwd = join(rootCwd, 'packages/app')

  await mkdir(cwd, { recursive: true })
  t.after(async () => rm(rootCwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    manifestPolicySources: [manifestPolicySource(rootCwd, true), manifestPolicySource(cwd, false)],
    rootCwd,
  })

  assertChecked(result)
  assert.equal(result.status, 'clean', describeResult(result))
})

test('should prefer the nearest manifest policy and project config', async (t) => {
  const rootCwd = await createProject({
    'tsconfig.json': '{"include":["src/**/*.ts"]}\n',
    'src/root.ts': 'export const root = rootMissing.value\n',
  })
  const cwd = join(rootCwd, 'packages/app')

  await mkdir(join(cwd, 'types'), { recursive: true })
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(
    join(cwd, 'tsconfig.json'),
    '{"compilerOptions":{"skipLibCheck":true},"include":["types/**/*.d.ts"]}\n'
  )
  await writeFile(join(cwd, 'types/broken.d.ts'), 'export declare const value: MissingType\n')

  t.after(async () => rm(rootCwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    manifestPolicySources: [manifestPolicySource(rootCwd, true), manifestPolicySource(cwd, false)],
    rootCwd,
  })

  assertChecked(result)
  assert.equal(result.status, 'diagnostics', describeResult(result))
  assert.equal(
    result.diagnostics.some(({ file }) =>
      file?.fileName.endsWith('/packages/app/types/broken.d.ts')),
    true,
    describeResult(result)
  )
  assert.equal(
    result.diagnostics.some(({ file }) => file?.fileName.endsWith('/src/root.ts')),
    false,
    describeResult(result)
  )
})

test('should return invalid manifest policy as a structured input constraint', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"include":["src/**/*.ts"]}\n',
    'src/index.ts': 'export {}\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const result = await typecheckProjectSources({
    cwd,
    manifestPolicySources: [manifestPolicySource(cwd, 'true')],
    rootCwd: cwd,
  })

  assert.deepEqual(result, {
    status: 'invalid-policy',
    cwd,
    policy: 'typecheckSkipLibCheck',
    expected: 'boolean',
    terminal: { exitCode: 1, reason: 'invalid-policy' },
  })
})
