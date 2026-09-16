import type { FetchLike }                       from '../runtime/download.js'
import type { RaijinRuntimeManifest }           from '../runtime/manifest.js'
import type { YarnCommandRunner }               from '../yarn/runner.js'
import type { YarnCommandReader }               from '../yarn/runner.js'
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
import { npath }                                from '@yarnpkg/fslib'

import { RaijinRuntimeDigestMismatchException } from '../runtime/exceptions/digest-mismatch.js'
import { ensurePackageManifest }                from '../initializer/project.js'
import { ensureYarnLock }                       from '../initializer/project.js'
import { downloadRaijinRuntime }                from '../runtime/download.js'
import { fetchRaijinRuntimeManifest }           from '../runtime/download.js'
import { createSha256Digest }                   from '../runtime/manifest.js'
import { getRaijinRuntimeYarnPath }             from '../runtime/manifest.js'
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
const RAIJIN_PACKAGE_NAME = '@atls/raijin'

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

const assertPackageMetadata = async (
  manifest: RaijinRuntimeManifest,
  cwd: string,
  queryPackage: YarnPackageQuery
): Promise<void> => {
  const metadata = await queryPackage(
    manifest.packageName,
    manifest.version,
    cwd,
    manifest.packageManager
  )

  if (
    metadata.name !== manifest.packageName ||
    metadata.version !== manifest.version ||
    metadata.gitHead !== manifest.sourceRevision ||
    metadata.dist.integrity !== manifest.packageIntegrity
  ) {
    throw new Error(`Raijin package metadata does not match release ${manifest.tagName}`)
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
    installed.name !== RAIJIN_PACKAGE_NAME ||
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
  manifest: RaijinRuntimeManifest,
  readCommand: YarnCommandReader
): Promise<void> => {
  const runtimePath = resolve(cwd, getRaijinRuntimeYarnPath())
  const configuration = await Configuration.find(npath.toPortablePath(cwd), null, { strict: false })
  const configuredPath = configuration.get('yarnPath')

  if (
    configuredPath !== npath.toPortablePath(runtimePath) ||
    createSha256Digest(await readFile(runtimePath)) !== manifest.sha256
  ) {
    throw new Error('Activated Raijin runtime path or digest does not match the release')
  }

  const version = (
    await readCommand(['--version'], cwd, {
      packageManager: manifest.packageManager,
      followYarnPath: true,
    })
  ).trim()
  const expectedVersion = manifest.packageManager.replace(/^yarn@/, '')

  if (version !== expectedVersion) {
    throw new Error(`Activated Yarn version ${version} does not match ${manifest.packageManager}`)
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
}: InstallRaijinOptions): Promise<RaijinRuntimeManifest> => {
  const manifest = await fetchRaijinRuntimeManifest(fetchImpl)

  await assertPackageMetadata(manifest, cwd, queryPackage)

  const runtime = await downloadRaijinRuntime(fetchImpl, manifest)
  const digest = createSha256Digest(runtime)

  if (digest !== manifest.sha256) {
    throw new RaijinRuntimeDigestMismatchException(manifest.sha256, digest)
  }

  await assertRuntimeModuleScope(join(cwd, getRaijinRuntimeYarnPath()))

  if (mode === 'bootstrap') {
    await ensurePackageManifest(cwd)
  }

  if (mode !== 'update') {
    await ensureYarnLock(cwd)
  }

  const stagedPath = getStagedRuntimePath(cwd, mode)

  await mkdir(dirname(stagedPath), { recursive: true })
  await writeFile(stagedPath, runtime)

  try {
    await runCommand(
      mode !== 'update'
        ? ['add', '--prefer-dev', '-E', `${manifest.packageName}@${manifest.version}`]
        : ['up', '-E', `${manifest.packageName}@${manifest.version}`],
      cwd,
      { packageManager: manifest.packageManager, skipInstallHooks: true }
    )
    await assertInstalledPackage(cwd, manifest.version, manifest.packageManager, readCommand)
    await updatePackageManager(cwd, manifest.packageManager)
    await activateRuntime(cwd, stagedPath)
    await assertActivatedPair(cwd, manifest, readCommand)
    await afterActivated?.(manifest.packageManager)
    await rm(stagedPath, { force: true })
  } catch (error) {
    throw new Error(
      `Raijin installation is staged at ${stagedPath}; rerun the installer to recover`,
      {
        cause: error,
      }
    )
  }

  return manifest
}
