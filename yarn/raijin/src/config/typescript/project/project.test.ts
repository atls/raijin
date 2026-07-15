import assert                       from 'node:assert/strict'
import { mkdir }                    from 'node:fs/promises'
import { mkdtemp }                  from 'node:fs/promises'
import { readFile }                 from 'node:fs/promises'
import { writeFile }                from 'node:fs/promises'
import { tmpdir }                   from 'node:os'
import { join }                     from 'node:path'
import test                         from 'node:test'

import typescript                   from 'typescript'

import { resolveTypeScriptProject } from './project.js'

const createProject = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typescript-config-'))

  await mkdir(join(cwd, 'src'))
  await mkdir(join(cwd, 'packages/lib'), { recursive: true })
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'src/index.ts'), 'export const value = 1\n')
  await writeFile(join(cwd, 'src/runtime.js'), 'export const runtime = 1\n')
  await writeFile(
    join(cwd, 'packages/lib/tsconfig.json'),
    '{"compilerOptions":{"composite":true},"files":[]}\n'
  )

  return cwd
}

test('should preserve inherited options, excludes, and references for explicit targets', async () => {
  const cwd = await createProject()
  const configPath = join(cwd, 'tsconfig.json')
  const source =
    '{"extends":"./tsconfig.base.json","files":[],"references":[{"path":"./packages/lib"}]}\n'

  await mkdir(join(cwd, 'excluded'))
  await writeFile(join(cwd, 'excluded/ignored.ts'), 'export const ignored = true\n')
  await writeFile(
    join(cwd, 'tsconfig.base.json'),
    '{"compilerOptions":{"allowJs":true,"strict":false},"exclude":["excluded"]}\n'
  )
  await writeFile(configPath, source)

  const config = await resolveTypeScriptProject({
    cwd,
    selection: {
      kind: 'explicit',
      patterns: ['src/index.ts', 'src/runtime.js', 'excluded/ignored.ts'],
    },
    typescript,
  })

  assert.equal(
    config.fileNames.some((file) => file.endsWith('/src/index.ts')),
    true
  )
  assert.equal(
    config.fileNames.some((file) => file.endsWith('/src/runtime.js')),
    true
  )
  assert.equal(
    config.fileNames.some((file) => file.endsWith('/excluded/ignored.ts')),
    false
  )
  assert.equal(config.options.allowJs, true)
  assert.equal(config.options.strict, false)
  assert.equal(config.projectReferences?.[0]?.path, join(cwd, 'packages/lib'))
  assert.equal(await readFile(configPath, 'utf8'), source)
})

test('should not replace configured scope with fallback targets', async () => {
  const cwd = await createProject()

  await writeFile(
    join(cwd, 'tsconfig.json'),
    '{"files":[],"references":[{"path":"./packages/lib"}]}\n'
  )

  const config = await resolveTypeScriptProject({
    cwd,
    selection: { kind: 'fallback', patterns: ['src/index.ts'] },
    typescript,
  })

  assert.equal(
    config.fileNames.some((file) => file.endsWith('/src/index.ts')),
    false
  )
  assert.equal(config.projectReferences?.[0]?.path, join(cwd, 'packages/lib'))
})

test('should apply fallback targets when project config is absent', async () => {
  const cwd = await createProject()
  const config = await resolveTypeScriptProject({
    cwd,
    selection: { kind: 'fallback', patterns: ['src/index.ts'] },
    typescript,
  })

  assert.equal(
    config.fileNames.some((file) => file.endsWith('/src/index.ts')),
    true
  )
})

test('should keep config ownership at the requested project scope', async () => {
  const cwd = await createProject()
  const workspaceCwd = join(cwd, 'packages/app')

  await writeFile(join(cwd, 'tsconfig.json'), '{"include":["src/**/*.ts"]}\n')
  await mkdir(join(workspaceCwd, 'src'), { recursive: true })
  await writeFile(join(workspaceCwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(workspaceCwd, 'src/index.ts'), 'export const workspace = true\n')

  const config = await resolveTypeScriptProject({
    cwd: workspaceCwd,
    typescript,
  })

  assert.equal(config.configFileName, undefined)
  assert.equal(
    config.fileNames.some((file) => file === join(workspaceCwd, 'src/index.ts')),
    true
  )
  assert.equal(
    config.fileNames.some((file) => file === join(cwd, 'src/index.ts')),
    false
  )
})

test('should apply project options over Raijin defaults', async () => {
  const cwd = await createProject()

  await writeFile(
    join(cwd, 'tsconfig.json'),
    '{"compilerOptions":{"module":"commonjs","strict":false},"include":["src/index.ts"]}\n'
  )

  const config = await resolveTypeScriptProject({ cwd, typescript })

  assert.equal(config.options.module, typescript.ModuleKind.CommonJS)
  assert.equal(config.options.strict, false)
  assert.equal(config.options.target, typescript.ScriptTarget.ES2022)
})

test('should append manifest ignore patterns through TypeScript discovery', async () => {
  const cwd = await createProject()

  await writeFile(
    join(cwd, 'package.json'),
    '{"type":"module","typecheckIgnorePatterns":["src/runtime.js"]}\n'
  )
  await writeFile(
    join(cwd, 'tsconfig.json'),
    '{"compilerOptions":{"allowJs":true},"include":["src/**/*"]}\n'
  )

  const config = await resolveTypeScriptProject({ cwd, typescript })

  assert.equal(
    config.fileNames.some((file) => file.endsWith('/src/index.ts')),
    true
  )
  assert.equal(
    config.fileNames.some((file) => file.endsWith('/src/runtime.js')),
    false
  )
})
