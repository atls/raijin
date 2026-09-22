import assert            from 'node:assert/strict'
import { execFile }      from 'node:child_process'
import { access }        from 'node:fs/promises'
import { copyFile }      from 'node:fs/promises'
import { mkdir }         from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { readFile }      from 'node:fs/promises'
import { realpath }      from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import test              from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify }     from 'node:util'

const execute = promisify(execFile)
const repoRoot = fileURLToPath(new URL('../../../../../../../../', import.meta.url))
const runtime = join(repoRoot, '.yarn/releases/yarn.js')

test('installed runtime keeps PnP root and node-modules client independent', async (context) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'raijin-hybrid-')))
  context.after(async () => rm(root, { recursive: true, force: true }))

  const client = join(root, 'client')
  const rootSource = join(root, 'source.ts')
  const clientSource = join(client, 'source.ts')
  const archive = join(root, 'raijin.tgz')
  const { packageManager } = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8')) as {
    packageManager: string
  }
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
  }

  for (const name of [
    'NODE_OPTIONS',
    'INIT_CWD',
    'PROJECT_CWD',
    'YARN_IGNORE_PATH',
    'BERRY_BIN_FOLDER',
    'npm_execpath',
    'npm_node_execpath',
  ]) {
    Reflect.deleteProperty(environment, name)
  }

  await mkdir(join(root, '.yarn/releases'), { recursive: true })
  await mkdir(client)
  await copyFile(runtime, join(root, '.yarn/releases/yarn.js'))
  await execute(
    process.execPath,
    [runtime, 'workspace', '@atls/raijin', 'pack', '--out', archive],
    {
      cwd: repoRoot,
      env: environment,
    }
  )
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'hybrid-consumer',
      private: true,
      type: 'module',
      packageManager,
      devDependencies: { '@atls/raijin': 'file:./raijin.tgz' },
    })
  )
  await writeFile(
    join(root, '.yarnrc.yml'),
    'nodeLinker: pnp\npnpEnableEsmLoader: true\npnpIgnorePatterns: ["./client/**"]\nyarnPath: .yarn/releases/yarn.js\n'
  )
  await writeFile(
    join(client, 'package.json'),
    JSON.stringify({
      name: 'independent-client',
      private: true,
      type: 'module',
      packageManager,
      devDependencies: { typescript: '5.9.3' },
    })
  )
  await writeFile(
    join(client, '.yarnrc.yml'),
    'nodeLinker: node-modules\nyarnPath: ../.yarn/releases/yarn.js\n'
  )
  await writeFile(join(client, 'yarn.lock'), '')
  await writeFile(join(client, '.prettierrc'), '{"semi":true}\n')
  await writeFile(rootSource, 'export const value={answer:42}\n')
  await writeFile(clientSource, 'export const value={answer:42}\n')

  await execute(process.execPath, [runtime, 'install', '--no-immutable'], {
    cwd: root,
    env: environment,
  })
  await execute(process.execPath, [runtime, 'install', '--no-immutable'], {
    cwd: client,
    env: environment,
  })

  await access(join(root, '.pnp.cjs'))
  await access(join(client, 'node_modules/typescript/package.json'))
  await assert.rejects(access(join(client, '.pnp.cjs')), { code: 'ENOENT' })

  await execute(process.execPath, [runtime, 'format', 'source.ts'], {
    cwd: root,
    env: environment,
  })
  await execute(process.execPath, [runtime, 'format', 'source.ts'], {
    cwd: client,
    env: environment,
  })

  assert.equal(await readFile(rootSource, 'utf8'), 'export const value = { answer: 42 }\n')
  assert.equal(await readFile(clientSource, 'utf8'), 'export const value = { answer: 42 };\n')
})
