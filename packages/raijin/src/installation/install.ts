import type { FetchLike }                       from '../runtime/download.js'
import type { YarnCommandRunner }               from '../yarn/runner.js'
import type { YarnCommandReader }               from '../yarn/runner.js'
import type { YarnPackageMetadata }             from '../yarn/runner.js'
import type { YarnPackageQuery }                from '../yarn/runner.js'

import { randomUUID }                           from 'node:crypto'
import { copyFile }                             from 'node:fs/promises'
import { access }                               from 'node:fs/promises'
import { mkdir }                                from 'node:fs/promises'
import { readFile }                             from 'node:fs/promises'
import { rename }                               from 'node:fs/promises'
import { rm }                                   from 'node:fs/promises'
import { writeFile }                            from 'node:fs/promises'
import { dirname }                              from 'node:path'
import { join }                                 from 'node:path'
import { resolve }                              from 'node:path'

import { Configuration }                        from '@yarnpkg/core'
import { Project }                              from '@yarnpkg/core'
import { npath }                                from '@yarnpkg/fslib'

import { RaijinRuntimeDigestMismatchException } from '../runtime/exceptions/digest-mismatch.js'
import { RAIJIN_RUNTIME_PACKAGE_NAME }          from '../runtime/release.js'
import { installRepositoryHooks }               from '../../hooks/install.js'
import { ensurePackageManifest }                from '../initializer/project.js'
import { ensureYarnLock }                       from '../initializer/project.js'
import { hasPackageJson }                       from '../initializer/project.js'
import { downloadRaijinRuntime }                from '../runtime/download.js'
import { createRaijinReleaseTagName }           from '../runtime/download.js'
import { fetchPublishedRaijinPackage }          from '../runtime/download.js'
import { fetchRaijinReleasePackageManager }     from '../runtime/download.js'
import { fetchRaijinReleaseRuntimeAsset }       from '../runtime/download.js'
import { fetchRaijinReleaseSourceRevision }     from '../runtime/download.js'
import { createSha256Digest }                   from '../runtime/release.js'
import { getRaijinRuntimeYarnPath }             from '../runtime/release.js'
import { queryYarnPackage }                     from '../yarn/command.js'
import { readYarnCommand }                      from '../yarn/command.js'
import { runYarnCommand }                       from '../yarn/command.js'

export interface InstallRaijinOptions {
  afterActivated?: (packageManager: string) => Promise<void>
  cwd: string
  fetchImpl?: FetchLike
  mode: 'bootstrap' | 'onboard' | 'update'
  queryYarnPackage?: YarnPackageQuery
  readYarnCommand?: YarnCommandReader
  runYarnCommand?: YarnCommandRunner
}

const STAGED_RUNTIME_EXTENSION = '.pending'
const BOOTSTRAP_STAGED_RUNTIME_EXTENSION = '.bootstrap.pending'
const RELEASE_PACKAGE_MANIFEST = 'package.json'
const RELEASE_PACKAGE_TYPE = 'module'

const getStagedRuntimePath = (cwd: string, mode: InstallRaijinOptions['mode']): string =>
  join(
    cwd,
    `${getRaijinRuntimeYarnPath()}${
      mode === 'bootstrap' ? BOOTSTRAP_STAGED_RUNTIME_EXTENSION : STAGED_RUNTIME_EXTENSION
    }`
  )

export const hasRaijinBootstrapStage = async (cwd: string): Promise<boolean> => {
  try {
    await access(getStagedRuntimePath(cwd, 'bootstrap'))
    return true
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

const resolveInstallationTarget = async (
  cwd: string,
  mode: InstallRaijinOptions['mode']
): Promise<string> => {
  const targetCwd = npath.toPortablePath(resolve(cwd))
  const projectCwd = await Configuration.findProjectCwd(targetCwd)

  if (!projectCwd || projectCwd === targetCwd) {
    return npath.fromPortablePath(targetCwd)
  }

  if (!(await hasPackageJson(cwd))) {
    throw new Error(
      `Raijin bootstrap target is nested beneath Yarn project ${projectCwd}; ` +
        'use the project root or establish a separate yarn.lock before retrying'
    )
  }

  const configuration = await Configuration.find(targetCwd, null, {
    strict: false,
    usePathCheck: null,
  })

  let isMemberWorkspace: boolean

  try {
    const { workspace } = await Project.find(configuration, targetCwd)
    isMemberWorkspace = workspace?.cwd === targetCwd
  } catch (error) {
    throw new Error(
      `Raijin target is nested beneath Yarn project ${projectCwd} but is not a member workspace; ` +
        'declare workspace membership or establish a separate yarn.lock before retrying',
      { cause: error }
    )
  }

  if (isMemberWorkspace && mode === 'bootstrap') {
    throw new Error(
      `Raijin bootstrap cannot scaffold a member workspace of Yarn project ${projectCwd}; ` +
        'run init at the project root or establish a separate project boundary'
    )
  }

  if (isMemberWorkspace) {
    throw new Error(
      `Raijin package and runtime must share Yarn project root ${projectCwd}; ` +
        'run update from that root, which must declare @atls/raijin in its package.json'
    )
  }

  throw new Error(`Raijin target is inside Yarn project ${projectCwd} but is not its root`)
}

const assertPackageMetadata = async (
  published: YarnPackageMetadata,
  sourceRevision: string,
  packageManager: string,
  cwd: string,
  queryPackage: YarnPackageQuery
): Promise<void> => {
  const metadata = await queryPackage(
    RAIJIN_RUNTIME_PACKAGE_NAME,
    published.version,
    cwd,
    packageManager
  )

  if (
    published.gitHead !== sourceRevision ||
    metadata.name !== RAIJIN_RUNTIME_PACKAGE_NAME ||
    metadata.version !== published.version ||
    metadata.gitHead !== sourceRevision ||
    metadata.dist.integrity !== published.dist.integrity
  ) {
    throw new Error(
      `Raijin package metadata does not match release ${createRaijinReleaseTagName(published.version)}`
    )
  }
}

const assertInstalledPackage = async (
  cwd: string,
  version: string,
  packageManager: string,
  readCommand: YarnCommandReader
): Promise<void> => {
  const stdout = await readCommand(
    [
      'node',
      '-e',
      "const p=require('@atls/raijin/package.json');process.stdout.write(JSON.stringify({name:p.name,version:p.version}))",
    ],
    cwd,
    { packageManager }
  )
  const installed: unknown = JSON.parse(stdout)

  if (
    !installed ||
    typeof installed !== 'object' ||
    !('name' in installed) ||
    installed.name !== RAIJIN_RUNTIME_PACKAGE_NAME ||
    !('version' in installed) ||
    installed.version !== version
  ) {
    throw new Error(`Installed Raijin package does not match ${version}`)
  }
}

const assertRuntimeModuleScope = async (runtimePath: string): Promise<boolean> => {
  const scopePath = join(dirname(runtimePath), RELEASE_PACKAGE_MANIFEST)

  try {
    const current = JSON.parse(await readFile(scopePath, 'utf-8')) as { type?: unknown }

    if (current.type !== RELEASE_PACKAGE_TYPE) {
      throw new Error(`Cannot activate ESM Raijin runtime: ${scopePath} is not type module`)
    }

    return true
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

const ensureRuntimeModuleScope = async (runtimePath: string): Promise<void> => {
  if (!(await assertRuntimeModuleScope(runtimePath))) {
    await writeFile(
      join(dirname(runtimePath), RELEASE_PACKAGE_MANIFEST),
      `${JSON.stringify({ type: RELEASE_PACKAGE_TYPE }, null, 2)}\n`
    )
  }
}

const updatePackageManager = async (cwd: string, packageManager: string): Promise<void> => {
  const manifestPath = join(cwd, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as Record<string, unknown>

  if (manifest.packageManager !== packageManager) {
    await writeFile(manifestPath, `${JSON.stringify({ ...manifest, packageManager }, null, 2)}\n`)
  }
}

const activateRuntime = async (cwd: string, stagedPath: string): Promise<void> => {
  const yarnPath = getRaijinRuntimeYarnPath()
  const runtimePath = join(cwd, yarnPath)
  const temporaryPath = `${runtimePath}.${process.pid}.${randomUUID()}.tmp`

  await mkdir(dirname(runtimePath), { recursive: true })

  try {
    await ensureRuntimeModuleScope(runtimePath)
    await copyFile(stagedPath, temporaryPath)
    await rename(temporaryPath, runtimePath)
    await Configuration.updateConfiguration(npath.toPortablePath(cwd), { yarnPath })
  } catch (error) {
    await rm(temporaryPath, { force: true })
    throw new Error(
      `Raijin installation is staged at ${stagedPath}; rerun the installer to recover`,
      {
        cause: error,
      }
    )
  }
}

const assertActivatedPair = async (
  cwd: string,
  packageManager: string,
  sha256: string,
  readCommand: YarnCommandReader
): Promise<void> => {
  const runtimePath = resolve(cwd, getRaijinRuntimeYarnPath())
  const configuration = await Configuration.find(npath.toPortablePath(cwd), null, { strict: false })
  const configuredPath = configuration.get('yarnPath')

  if (
    configuredPath !== npath.toPortablePath(runtimePath) ||
    createSha256Digest(await readFile(runtimePath)) !== sha256
  ) {
    throw new Error('Activated Raijin runtime path or digest does not match the release')
  }

  const version = (
    await readCommand(['--version'], cwd, {
      packageManager,
      followYarnPath: true,
    })
  ).trim()
  const expectedVersion = packageManager.replace(/^yarn@/, '')

  if (version !== expectedVersion) {
    throw new Error(`Activated Yarn version ${version} does not match ${packageManager}`)
  }
}

export const installRaijin = async ({
  afterActivated,
  cwd,
  fetchImpl = fetch,
  mode,
  queryYarnPackage: queryPackage = queryYarnPackage,
  readYarnCommand: readCommand = readYarnCommand,
  runYarnCommand: runCommand = runYarnCommand,
}: InstallRaijinOptions): Promise<void> => {
  const targetCwd = await resolveInstallationTarget(cwd, mode)

  const published = await fetchPublishedRaijinPackage(fetchImpl)
  const { version } = published
  const tagName = createRaijinReleaseTagName(version)
  const asset = await fetchRaijinReleaseRuntimeAsset(fetchImpl, tagName)
  const sourceRevision = await fetchRaijinReleaseSourceRevision(fetchImpl, tagName)
  const packageManager = await fetchRaijinReleasePackageManager(fetchImpl, sourceRevision)

  await assertPackageMetadata(published, sourceRevision, packageManager, targetCwd, queryPackage)

  const runtime = await downloadRaijinRuntime(fetchImpl, asset.url)
  const digest = createSha256Digest(runtime)

  if (digest !== asset.sha256) {
    throw new RaijinRuntimeDigestMismatchException(asset.sha256, digest)
  }

  await assertRuntimeModuleScope(join(targetCwd, getRaijinRuntimeYarnPath()))

  if (mode === 'bootstrap') {
    await ensurePackageManifest(targetCwd)
  }

  await ensureYarnLock(targetCwd)

  const stagedPath = getStagedRuntimePath(targetCwd, mode)

  await mkdir(dirname(stagedPath), { recursive: true })
  await writeFile(stagedPath, runtime)

  try {
    await runCommand(
      mode !== 'update'
        ? ['add', '--prefer-dev', '-E', `${RAIJIN_RUNTIME_PACKAGE_NAME}@${version}`]
        : ['up', '-E', `${RAIJIN_RUNTIME_PACKAGE_NAME}@${version}`],
      targetCwd,
      { packageManager, skipInstallHooks: true }
    )
    await assertInstalledPackage(targetCwd, version, packageManager, readCommand)
    await updatePackageManager(targetCwd, packageManager)
    await activateRuntime(targetCwd, stagedPath)
    await assertActivatedPair(targetCwd, packageManager, asset.sha256, readCommand)
    await afterActivated?.(packageManager)
    await installRepositoryHooks(targetCwd)
    await rm(stagedPath, { force: true })
  } catch (error) {
    throw new Error(
      `Raijin installation is staged at ${stagedPath}; rerun the installer to recover`,
      {
        cause: error,
      }
    )
  }
}
