/* eslint-disable no-console */

import type { PortablePath }      from '@yarnpkg/fslib'

import assert                     from 'node:assert/strict'
import { execFile }               from 'node:child_process'
import { access }                 from 'node:fs/promises'
import { mkdir }                  from 'node:fs/promises'
import { mkdtemp }                from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { rm }                     from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { join }                   from 'node:path'
import { promisify }              from 'node:util'

import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { getPluginConfiguration } from '@yarnpkg/cli'
import { npath }                  from '@yarnpkg/fslib'
import { ppath }                  from '@yarnpkg/fslib'

type Linker = 'node-modules' | 'pnp'
type ScaffoldType = 'library' | 'project'

interface RuntimeContext {
  globalFolder: PortablePath
  packageManager: string
  projectCwd: PortablePath
  runtimePath: PortablePath
}

interface RuntimeExecutionError extends Error {
  stderr?: string
  stdout?: string
}

const execute = promisify(execFile)
const STALE_ARTIFACT = '{"stale":true}\n'

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

const createRuntimeEnvironment = (): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
  }

  delete environment.INIT_CWD
  delete environment.NODE_OPTIONS
  delete environment.NODE_PATH
  delete environment.PROJECT_CWD
  delete environment.RAIJIN_COMMAND_INVOCATION_CWD
  delete environment.RAIJIN_COMMAND_PROXY_EXECUTION

  return environment
}

const runRuntime = async (
  runtimePath: PortablePath,
  cwd: string,
  args: Array<string>
): Promise<void> => {
  try {
    await execute(process.execPath, [npath.fromPortablePath(runtimePath), ...args], {
      cwd,
      encoding: 'utf8',
      env: createRuntimeEnvironment(),
      maxBuffer: 20 * 1024 * 1024,
    })
  } catch (error) {
    const executionError = error as RuntimeExecutionError

    throw new Error(
      [executionError.message, executionError.stdout, executionError.stderr]
        .filter(Boolean)
        .join('\n')
    )
  }
}

const resolveRuntimeContext = async (): Promise<RuntimeContext> => {
  const cwd = npath.toPortablePath(process.cwd())
  const configuration = await Configuration.find(cwd, getPluginConfiguration())
  const { project, workspace } = await Project.find(configuration, cwd)
  const { packageManager } = project.topLevelWorkspace.manifest

  if (!workspace || !packageManager) {
    throw new Error('Raijin smoke requires the package workspace and project packageManager')
  }

  return {
    globalFolder: configuration.get('globalFolder'),
    packageManager,
    projectCwd: project.cwd,
    runtimePath: ppath.join(project.cwd, '.yarn/releases/yarn.mjs' as PortablePath),
  }
}

const packRaijin = async (context: RuntimeContext, fixture: string): Promise<string> => {
  const tarball = join(fixture, 'atls-raijin.tgz')

  await runRuntime(context.runtimePath, npath.fromPortablePath(context.projectCwd), [
    'workspace',
    '@atls/raijin',
    'pack',
    '--out',
    tarball,
  ])

  return tarball
}

const writeTarget = async (target: string, linker: Linker, type: ScaffoldType): Promise<void> => {
  await mkdir(target, { recursive: true })
  await writeFile(
    join(target, 'package.json'),
    `${JSON.stringify(
      {
        name: `@fixture/${linker}-${type}`,
        private: true,
        type: 'module',
      },
      null,
      2
    )}\n`
  )
  await writeFile(join(target, 'tsconfig.json'), '{"compilerOptions":{"composite":true}}\n')
  await writeFile(join(target, '.gitignore'), 'fixture-cache/\n')
}

const writeConsumer = async (
  context: RuntimeContext,
  projectRoot: string,
  tarball: string,
  linker: Linker
): Promise<Map<ScaffoldType, string>> => {
  const targets = new Map<ScaffoldType, string>([
    ['project', join(projectRoot, 'packages/project')],
    ['library', join(projectRoot, 'packages/library')],
  ])

  await mkdir(join(projectRoot, '.yarn/schematic'), { recursive: true })
  await writeFile(
    join(projectRoot, 'package.json'),
    `${JSON.stringify(
      {
        private: true,
        workspaces: ['packages/*'],
        packageManager: context.packageManager,
        devDependencies: {
          '@atls/raijin': `file:${npath.toPortablePath(tarball)}`,
        },
      },
      null,
      2
    )}\n`
  )
  await writeFile(
    join(projectRoot, '.yarnrc.yml'),
    [
      'enableGlobalCache: true',
      `globalFolder: ${JSON.stringify(context.globalFolder)}`,
      `nodeLinker: ${linker}`,
      'pnpEnableEsmLoader: true',
      `yarnPath: ${JSON.stringify(context.runtimePath)}`,
      '',
    ].join('\n')
  )
  await writeFile(join(projectRoot, '.yarn/schematic/collection.json'), STALE_ARTIFACT)

  await Promise.all(
    Array.from(targets, async ([type, target]) => writeTarget(target, linker, type))
  )

  return targets
}

const assertCommonContract = async (target: string): Promise<void> => {
  const tsconfig = JSON.parse(await readFile(join(target, 'tsconfig.json'), 'utf8')) as {
    compilerOptions: Record<string, unknown>
  }

  assert.equal(
    await readFile(join(target, '.prettierrc.mjs'), 'utf8'),
    "import config from '@atls/raijin/prettier'\n\nexport default config\n"
  )
  assert.match(await readFile(join(target, 'eslint.config.mjs'), 'utf8'), /@atls\/raijin\/eslint/)
  assert.match(await readFile(join(target, '.github/workflows/checks.yaml'), 'utf8'), /yarn check/)
  assert.equal(tsconfig.compilerOptions.composite, true)
  assert.equal(tsconfig.compilerOptions.module, 'NodeNext')
  assert.equal(tsconfig.compilerOptions.target, 'es2022')

  const gitignore = await readFile(join(target, '.gitignore'), 'utf8')

  assert.match(gitignore, /node_modules/)
  assert.match(gitignore, /dist\//)
  assert.equal(gitignore.match(/fixture-cache\//g)?.length, 1)
}

const assertTypeContract = async (target: string, type: ScaffoldType): Promise<void> => {
  if (type === 'project') {
    const releaseWorkflow = await readFile(join(target, '.github/workflows/release.yaml'), 'utf8')
    const previewWorkflow = await readFile(join(target, '.github/workflows/preview.yaml'), 'utf8')

    assert.match(releaseWorkflow, /types: \[closed\]/)
    assert.match(releaseWorkflow, /--tag-policy hash-timestamp/)
    assert.match(previewWorkflow, /types: \[opened, reopened, synchronize\]/)
    assert.match(previewWorkflow, /--tag-policy ctx-hash-timestamp/)
    assert.equal(await pathExists(join(target, '.github/workflows/publish.yaml')), false)
    assert.equal(await pathExists(join(target, '.github/workflows/version.yaml')), false)

    return
  }

  assert.match(
    await readFile(join(target, '.github/workflows/publish.yaml'), 'utf8'),
    /npm publish --access public/
  )
  assert.match(
    await readFile(join(target, '.github/workflows/version.yaml'), 'utf8'),
    /version patch --deferred/
  )
  assert.equal(await pathExists(join(target, '.github/workflows/release.yaml')), false)
  assert.equal(await pathExists(join(target, '.github/workflows/preview.yaml')), false)
}

const runConsumer = async (
  context: RuntimeContext,
  fixture: string,
  tarball: string,
  linker: Linker
): Promise<void> => {
  const projectRoot = join(fixture, linker)
  const targets = await writeConsumer(context, projectRoot, tarball, linker)

  await runRuntime(context.runtimePath, projectRoot, ['install'])

  await Promise.all(
    Array.from(targets, async ([type, target]) => {
      await runRuntime(context.runtimePath, target, ['generate', 'project', '--type', type])
      await assertCommonContract(target)
      await assertTypeContract(target, type)
    })
  )

  assert.equal(
    await readFile(join(projectRoot, '.yarn/schematic/collection.json'), 'utf8'),
    STALE_ARTIFACT
  )

  if (linker === 'pnp') {
    assert.equal(await pathExists(join(projectRoot, 'node_modules')), false)
  } else {
    assert.equal(
      await pathExists(
        join(projectRoot, 'node_modules/@atls/raijin/dist/schematic/collection.json')
      ),
      true
    )
  }
}

const fixture = await mkdtemp(join(tmpdir(), 'raijin-project-generation-'))

try {
  const context = await resolveRuntimeContext()
  const tarball = await packRaijin(context, fixture)

  await runConsumer(context, fixture, tarball, 'pnp')
  await runConsumer(context, fixture, tarball, 'node-modules')

  console.info('Project generation runtime smoke passed for pnp and node-modules')
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exitCode = 1
} finally {
  await rm(fixture, { recursive: true, force: true })
}
