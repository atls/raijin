import assert            from 'node:assert/strict'
import { execFile }      from 'node:child_process'
import { copyFile }      from 'node:fs/promises'
import { mkdir }         from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { readFile }      from 'node:fs/promises'
import { realpath }      from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { delimiter }     from 'node:path'
import { join }          from 'node:path'
import { test }          from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify }     from 'node:util'

const execute = promisify(execFile)
const repoRoot = fileURLToPath(new URL('../../../../../../', import.meta.url))

test(
  'focused check keeps the invoking workspace configuration in an installed project',
  {
    timeout: 120_000,
  },
  async (t) => {
    const cwd = await realpath(await mkdtemp(join(tmpdir(), 'raijin-focused-check-')))
    const app = join(cwd, 'packages/app')
    const archive = join(cwd, 'raijin.tgz')
    const runtime = join(cwd, '.yarn/releases/yarn.mjs')
    const source = "export {};\nconst unused = 1;\nconsole.log('hello');\n"
    const environment: NodeJS.ProcessEnv = {
      ...process.env,
      GITHUB_ACTIONS: 'true',
      YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
    }
    const binFolder = environment.BERRY_BIN_FOLDER

    if (binFolder && environment.PATH) {
      environment.PATH = environment.PATH.split(delimiter)
        .filter((path) => path !== binFolder)
        .join(delimiter)
    }

    for (const name of [
      'NODE_OPTIONS',
      'NODE_PATH',
      'NODE_TEST_CONTEXT',
      'RAIJIN_NODE_LOADER',
      'RAIJIN_NODE_LOADER_REGISTRATION',
      'RAIJIN_REGISTERED_PNP_LOADER',
      'YARN_IGNORE_PATH',
      'BERRY_BIN_FOLDER',
      'INIT_CWD',
      'PROJECT_CWD',
      'npm_execpath',
      'npm_node_execpath',
    ]) {
      Reflect.deleteProperty(environment, name)
    }

    t.after(async () => rm(cwd, { recursive: true, force: true }))

    await execute('corepack', ['yarn', 'workspace', '@atls/raijin', 'pack', '--out', archive], {
      cwd: repoRoot,
      env: environment,
    })
    await mkdir(join(cwd, '.yarn/releases'), { recursive: true })
    await mkdir(app, { recursive: true })
    await copyFile(join(repoRoot, '.yarn/releases/yarn.mjs'), runtime)
    await writeFile(
      join(cwd, 'package.json'),
      JSON.stringify({
        name: 'focused-check-fixture',
        private: true,
        type: 'module',
        packageManager: 'yarn@4.14.1',
        workspaces: ['packages/*'],
        devDependencies: { '@atls/raijin': 'file:./raijin.tgz' },
      })
    )
    await writeFile(
      join(cwd, '.yarnrc.yml'),
      'nodeLinker: pnp\npnpEnableEsmLoader: true\nyarnPath: .yarn/releases/yarn.mjs\n'
    )
    await writeFile(join(cwd, '.prettierrc.mjs'), 'export default { singleQuote: false }\n')
    await writeFile(join(app, '.prettierrc.mjs'), 'export default { singleQuote: true }\n')
    await writeFile(
      join(cwd, 'eslint.config.mjs'),
      "export default [{ files: ['**/*.ts'], rules: { 'no-console': 'error' } }]\n"
    )
    await writeFile(
      join(app, 'eslint.config.mjs'),
      "export default [{ files: ['**/*.ts'], rules: { 'no-console': 'off' } }]\n"
    )
    await writeFile(
      join(cwd, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noUnusedLocals: false,
          skipLibCheck: true,
          types: [],
        },
        include: ['packages/app/source.ts'],
      })
    )
    await writeFile(
      join(app, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noUnusedLocals: true,
          skipLibCheck: true,
          types: [],
        },
        files: ['source.ts'],
      })
    )
    await writeFile(join(app, 'package.json'), JSON.stringify({ name: 'app', type: 'module' }))
    await writeFile(join(app, 'source.ts'), source)
    await mkdir(join(app, 'integration'))
    await writeFile(
      join(app, 'source.test.js'),
      "import test from 'node:test'\ntest('unit', () => {})\n"
    )
    await writeFile(
      join(app, 'integration/source.test.js'),
      "import test from 'node:test'\ntest('integration', () => {})\n"
    )

    await execute(process.execPath, [runtime, 'install'], { cwd, env: environment })
    await execute(process.execPath, [runtime, 'format', 'source.ts'], {
      cwd: app,
      env: environment,
    })
    const formattedSource = await readFile(join(app, 'source.ts'), 'utf8')

    assert.match(formattedSource, /console\.log\('hello'\)/)

    await assert.rejects(
      execute(process.execPath, [runtime, 'check', '--verify', 'source.ts'], {
        cwd: app,
        env: environment,
        maxBuffer: 8 * 1024 * 1024,
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.equal(Reflect.get(error, 'code'), 1)
        const output = `${Reflect.get(error, 'stdout')}${Reflect.get(error, 'stderr')}`

        assert.match(output, /Format\nLint\n/)
        assert.match(output, /TypeCheck/)
        assert.match(output, /unused|never read/)
        assert.doesNotMatch(output, /Format drift|no-console/)

        return true
      }
    )
    assert.equal(await readFile(join(app, 'source.ts'), 'utf8'), formattedSource)

    await execute(process.execPath, [runtime, 'format', 'packages/app'], {
      cwd,
      env: environment,
    })
    const packageSource = await readFile(join(app, 'source.ts'), 'utf8')

    await assert.rejects(
      execute(process.execPath, [runtime, 'check', '--verify', 'packages/app'], {
        cwd,
        env: environment,
        maxBuffer: 8 * 1024 * 1024,
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.equal(Reflect.get(error, 'code'), 1)
        const output = `${Reflect.get(error, 'stdout')}${Reflect.get(error, 'stderr')}`

        assert.match(output, /Format\nLint\nTypeCheck\n/)
        assert.match(output, /TS6133/)
        assert.match(output, /Test:unit\n/)
        assert.match(output, /Test:integration\n/)
        assert.doesNotMatch(output, /TS6053|Format drift|no-console/)

        return true
      }
    )
    assert.equal(await readFile(join(app, 'source.ts'), 'utf8'), packageSource)
  }
)
