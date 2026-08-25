import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import assert                           from 'node:assert/strict'
import { mkdir }                        from 'node:fs/promises'
import { mkdtemp }                      from 'node:fs/promises'
import { readdir }                      from 'node:fs/promises'
import { rm }                           from 'node:fs/promises'
import { writeFile }                    from 'node:fs/promises'
import { tmpdir }                       from 'node:os'
import { join }                         from 'node:path'
import { describe }                     from 'node:test'
import { test }                         from 'node:test'

import { ts }                           from '@atls/raijin/typescript'

import { checkProject }                 from '../project.js'

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

describe('root project discovery', () => {
  test('checks the root config when invoked from the project root', async (t) => {
    const cwd = await createProject({
      'tsconfig.json': '{"files":["src/index.ts"]}\n',
      'src/index.ts': 'export const value = true\n',
    })
    const before = await readTree(cwd)

    t.after(async () => rm(cwd, { recursive: true, force: true }))

    const diagnostics = checkProject(cwd, cwd, undefined, ts)

    assertDiagnostics(diagnostics)
    assert.deepEqual(diagnostics, [])
    assert.deepEqual(await readTree(cwd), before)
  })

  test('finds an internal root config when invoked from a nested directory', async (t) => {
    const cwd = await createProject({
      'tsconfig.json': '{"files":["packages/app/src/index.ts"]}\n',
      'packages/app/src/index.ts': 'export const value = true\n',
    })
    const nestedCwd = join(cwd, 'packages/app/src')

    t.after(async () => rm(cwd, { recursive: true, force: true }))

    const diagnostics = checkProject(nestedCwd, cwd, undefined, ts)

    assertDiagnostics(diagnostics)
    assert.deepEqual(diagnostics, [])
  })

  test('does not accept a config above the project root', async (t) => {
    const parentCwd = await createProject({
      'tsconfig.json': '{"files":["parent.ts"]}\n',
      'parent.ts': 'export const parentValue = true\n',
      'project/package.json': '{"type":"module"}\n',
      'project/index.ts': 'export const projectValue = true\n',
    })
    const projectCwd = join(parentCwd, 'project')
    const checkedFiles: Array<string> = []
    const { fileExists } = ts.sys

    t.after(async () => rm(parentCwd, { recursive: true, force: true }))
    t.mock.method(ts.sys, 'fileExists', (fileName: string) => {
      checkedFiles.push(ts.sys.resolvePath(fileName))

      return fileExists(fileName)
    })

    assert.equal(checkProject(projectCwd, projectCwd, undefined, ts), undefined)
    assert.deepEqual(checkedFiles, [ts.sys.resolvePath(join(projectCwd, 'tsconfig.json'))])
  })
})

test('preserves native extends, include, exclude, and compiler options', async (t) => {
  const cwd = await createProject({
    'configs/base.json': JSON.stringify({
      compilerOptions: { noUnusedLocals: true, strict: true },
    }),
    'tsconfig.json': JSON.stringify({
      extends: './configs/base.json',
      include: ['src/**/*.ts'],
      exclude: ['src/excluded.ts'],
    }),
    'src/included.ts': 'const unused = true\nexport const included: string = 1\n',
    'src/excluded.ts': 'export const excluded = missing.value\n',
  })

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const diagnostics = checkProject(cwd, cwd, undefined, ts)

  assertDiagnostics(diagnostics)
  assert.equal(hasDiagnostic(diagnostics, 2322, '/src/included.ts'), true)
  assert.equal(hasDiagnostic(diagnostics, 6133, '/src/included.ts'), true)
  assert.equal(
    diagnostics.some(({ file }) => file?.fileName.endsWith('/src/excluded.ts')),
    false
  )
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

  const diagnostics = checkProject(cwd, cwd, undefined, ts)

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

  const diagnostics = checkProject(cwd, cwd, undefined, ts)

  assertDiagnostics(diagnostics)
  assert.equal(hasDiagnostic(diagnostics, 5083), true)
})
