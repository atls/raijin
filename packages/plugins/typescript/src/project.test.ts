import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import assert                           from 'node:assert/strict'
import { mkdir }                        from 'node:fs/promises'
import { mkdtemp }                      from 'node:fs/promises'
import { readdir }                      from 'node:fs/promises'
import { rm }                           from 'node:fs/promises'
import { writeFile }                    from 'node:fs/promises'
import { tmpdir }                       from 'node:os'
import { join }                         from 'node:path'
import { test }                         from 'node:test'

import { ts }                           from '@atls/raijin/typescript'

import { checkProject }                 from './project.js'

const createProject = async (files: Record<string, string>): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-project-'))

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

const readTree = async (cwd: string): Promise<Array<string>> =>
  (await readdir(cwd, { recursive: true })).sort()

const assertDiagnostics: (
  diagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic> | undefined
) => asserts diagnostics is ReadonlyArray<TypeScriptRuntime.Diagnostic> = (diagnostics) => {
  assert.ok(diagnostics)
}

const hasDiagnostic = (
  diagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic>,
  code: number,
  fileSuffix?: string
): boolean =>
  diagnostics.some(
    (diagnostic) =>
      diagnostic.code === code &&
      (fileSuffix === undefined || diagnostic.file?.fileName.endsWith(fileSuffix) === true)
  )

test('checks a normal project without writing files', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"files":["src/index.ts"]}\n',
    'src/index.ts': 'export const value = true\n',
  })
  const before = await readTree(cwd)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const diagnostics = checkProject(cwd, undefined, ts)

  assertDiagnostics(diagnostics)
  assert.deepEqual(diagnostics, [])
  assert.deepEqual(await readTree(cwd), before)
})

test('checks root, app, and lib sources without prebuilt declarations or writes', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"files":[],"references":[{"path":"./packages/app"}]}\n',
    'packages/app/tsconfig.json': JSON.stringify({
      compilerOptions: {
        composite: true,
        declaration: true,
        declarationMap: true,
        incremental: true,
        outDir: 'dist',
        rootDir: 'src',
        sourceMap: true,
      },
      files: ['src/index.ts'],
      references: [{ path: '../lib' }],
    }),
    'packages/app/src/index.ts':
      "import { lib } from '../../lib/dist/index.js'\n\nexport const app: number = 'app'\nexport { lib }\n",
    'packages/lib/tsconfig.json': JSON.stringify({
      compilerOptions: {
        composite: true,
        declaration: true,
        declarationMap: true,
        incremental: true,
        outDir: 'dist',
        rootDir: 'src',
        sourceMap: true,
      },
      files: ['src/index.ts'],
    }),
    'packages/lib/src/index.ts': 'export const lib: string = true\n',
  })
  const before = await readTree(cwd)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const diagnostics = checkProject(cwd, undefined, ts)

  assertDiagnostics(diagnostics)
  assert.equal(hasDiagnostic(diagnostics, 2322, '/packages/app/src/index.ts'), true)
  assert.equal(hasDiagnostic(diagnostics, 2322, '/packages/lib/src/index.ts'), true)
  assert.deepEqual(await readTree(cwd), before)
})

test('keeps missing reference failures as TypeScript diagnostics', async (t) => {
  const cwd = await createProject({
    'tsconfig.json': '{"files":[],"references":[{"path":"./missing"}]}\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const diagnostics = checkProject(cwd, undefined, ts)

  assertDiagnostics(diagnostics)
  assert.equal(hasDiagnostic(diagnostics, 5083), true)
})
