import assert            from 'node:assert/strict'
import { execFile }      from 'node:child_process'
import { copyFile }      from 'node:fs/promises'
import { mkdir }         from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { readFile }      from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import { test }          from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify }     from 'node:util'

const execute = promisify(execFile)
const repoRoot = fileURLToPath(new URL('../../../../../../../', import.meta.url))
const repositoryRuntime = join(repoRoot, '.yarn/releases/yarn.mjs')

const environment = (): NodeJS.ProcessEnv => {
  const env = { ...process.env }

  for (const name of [
    'BERRY_BIN_FOLDER',
    'INIT_CWD',
    'NODE_OPTIONS',
    'NODE_PATH',
    'PROJECT_CWD',
    'YARN_IGNORE_PATH',
    'YARN_VERSION',
    'YARN_YARN_PATH',
    'npm_execpath',
    'npm_node_execpath',
  ]) {
    Reflect.deleteProperty(env, name)
  }

  env.YARN_ENABLE_IMMUTABLE_INSTALLS = 'false'

  return env
}

const run = async (cwd: string, args: Array<string>) =>
  execute(process.execPath, [join(cwd, '.yarn/releases/yarn.mjs'), ...args], {
    cwd,
    env: environment(),
    maxBuffer: 8 * 1024 * 1024,
  })

const materializeRuntime = async (cwd: string): Promise<void> => {
  await mkdir(join(cwd, '.yarn/releases'), { recursive: true })
  await copyFile(repositoryRuntime, join(cwd, '.yarn/releases/yarn.mjs'))
}

test(
  'imports and typechecks a packed library artifact from a disposable Yarn PnP ESM consumer',
  { timeout: 120_000 },
  async (t) => {
    const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-consumer-'))
    const raijinArchive = join(cwd, 'raijin.tgz')
    const libraryCwd = join(cwd, 'library')
    const libraryArchive = join(cwd, 'library.tgz')
    const consumerCwd = join(cwd, 'consumer')
    const { packageManager } = JSON.parse(
      await readFile(join(repoRoot, 'package.json'), 'utf8')
    ) as { packageManager: string }

    t.after(async () => rm(cwd, { force: true, recursive: true }))

    await run(repoRoot, ['workspace', '@atls/raijin', 'pack', '--out', raijinArchive])

    await mkdir(join(libraryCwd, 'src'), { recursive: true })
    await materializeRuntime(libraryCwd)
    await writeFile(
      join(libraryCwd, 'package.json'),
      `${JSON.stringify({
        name: '@fixture/library',
        version: '1.0.0',
        private: true,
        type: 'module',
        packageManager,
        files: ['lib'],
        scripts: {
          build: 'yarn library build --target ./lib',
          prepack: 'yarn run build',
        },
        devDependencies: {
          '@atls/raijin': `file:${raijinArchive}`,
          typescript: '5.9.3',
        },
        publishConfig: {
          exports: {
            '.': {
              default: './lib/index.js',
              import: './lib/index.js',
              types: './lib/index.d.ts',
            },
            './features/*': {
              default: './lib/features/*.js',
              import: './lib/features/*.js',
              types: './lib/features/*.d.ts',
            },
          },
        },
      })}\n`
    )
    await writeFile(
      join(libraryCwd, '.yarnrc.yml'),
      'nodeLinker: pnp\npnpEnableEsmLoader: true\nyarnPath: .yarn/releases/yarn.mjs\n'
    )
    await writeFile(
      join(libraryCwd, 'tsconfig.json'),
      `${JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          target: 'es2022',
        },
        include: ['src/**/*'],
      })}\n`
    )
    await writeFile(
      join(libraryCwd, 'src/index.ts'),
      "export { legacy } from './legacy.tsx'\nexport { typed } from './typed.ts'\n"
    )
    await mkdir(join(libraryCwd, 'src/features/nested'), { recursive: true })
    await writeFile(
      join(libraryCwd, 'src/features/nested/value.ts'),
      "export const feature: string = 'feature'\n"
    )
    await writeFile(join(libraryCwd, 'src/legacy.tsx'), "export const legacy = 'legacy'\n")
    await writeFile(join(libraryCwd, 'src/typed.ts'), "export const typed: string = 'typed'\n")

    await run(libraryCwd, ['install'])
    await run(libraryCwd, ['pack', '--out', libraryArchive])

    await mkdir(consumerCwd)
    await materializeRuntime(consumerCwd)
    await writeFile(
      join(consumerCwd, 'package.json'),
      `${JSON.stringify({
        name: 'library-consumer',
        private: true,
        type: 'module',
        packageManager,
        dependencies: {
          '@fixture/library': `file:${libraryArchive}`,
          typescript: '5.9.3',
        },
      })}\n`
    )
    await writeFile(
      join(consumerCwd, '.yarnrc.yml'),
      'nodeLinker: pnp\npnpEnableEsmLoader: true\nyarnPath: .yarn/releases/yarn.mjs\n'
    )
    await writeFile(
      join(consumerCwd, 'tsconfig.json'),
      '{"compilerOptions":{"module":"NodeNext","moduleResolution":"NodeNext","strict":true,"target":"es2022"},"files":["index.ts"]}\n'
    )
    await writeFile(
      join(consumerCwd, 'index.mjs'),
      "import { legacy, typed } from '@fixture/library'\nimport { feature } from '@fixture/library/features/nested/value'\nprocess.stdout.write(`${legacy}:${typed}:${feature}\\n`)\n"
    )
    await writeFile(
      join(consumerCwd, 'index.ts'),
      "import { legacy, typed } from '@fixture/library'\nimport { feature } from '@fixture/library/features/nested/value'\nconst values: Array<string> = [legacy, typed, feature]\nexport { values }\n"
    )

    await run(consumerCwd, ['install'])

    const imported = await run(consumerCwd, ['node', 'index.mjs'])

    assert.equal(imported.stdout, 'legacy:typed:feature\n')
    await run(consumerCwd, ['exec', 'tsc', '--noEmit'])
    assert.match(
      (await run(consumerCwd, ['node', '-p', 'process.versions.pnp'])).stdout,
      /^\d+\s*$/u
    )
  }
)
