import type { RaijinRuntimeManifest }         from '@atls/raijin/runtime'
import type { Configuration }                 from '@yarnpkg/core'
import type { Dirent }                        from 'node:fs'

import { mkdir }                              from 'node:fs/promises'
import { readFile }                           from 'node:fs/promises'
import { readdir }                            from 'node:fs/promises'
import { rm }                                 from 'node:fs/promises'
import { writeFile }                          from 'node:fs/promises'
import { dirname }                            from 'node:path'
import { isAbsolute }                         from 'node:path'
import { join }                               from 'node:path'

import { Configuration as YarnConfiguration } from '@yarnpkg/core'
import { httpUtils }                          from '@yarnpkg/core'

import { RAIJIN_RUNTIME_MANIFEST_URL }        from '@atls/raijin/runtime'
import { createSha256Digest }                 from '@atls/raijin/runtime'
import { getRaijinRuntimeYarnPath }           from '@atls/raijin/runtime'
import { parseRaijinRuntimeManifest }         from '@atls/raijin/runtime'

import { portableToNativePath }               from './set-version.utils.js'

type ConfigurationUpdate = Parameters<typeof YarnConfiguration.updateConfiguration>[1]
type ConfigurationUpdateCwd = Parameters<typeof YarnConfiguration.updateConfiguration>[0]

const LEGACY_RAIJIN_RUNTIME_FILE_NAMES = new Set(['yarn-remote.mjs'])
const LEGACY_RAIJIN_RUNTIME_FILE_PATTERN = /^raijin-yarn-.+\.mjs$/

const isNotFoundError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

const isLegacyRaijinRuntimeFileName = (fileName: string): boolean =>
  LEGACY_RAIJIN_RUNTIME_FILE_NAMES.has(fileName) ||
  LEGACY_RAIJIN_RUNTIME_FILE_PATTERN.test(fileName)

const readDirectoryEntries = async (path: string): Promise<Array<Dirent>> => {
  try {
    return await readdir(path, { withFileTypes: true })
  } catch (error) {
    if (isNotFoundError(error)) {
      return []
    }

    throw error
  }
}

export const fetchRaijinRuntimeManifest = async (
  configuration: Configuration
): Promise<RaijinRuntimeManifest> =>
  parseRaijinRuntimeManifest(
    await httpUtils.get(RAIJIN_RUNTIME_MANIFEST_URL, {
      configuration,
      headers: {
        accept: 'application/json',
        'user-agent': 'raijin-yarn-plugin-essentials',
      },
      jsonResponse: true,
    })
  )

const downloadRaijinRuntime = async (
  configuration: Configuration,
  manifest: RaijinRuntimeManifest
): Promise<Buffer> => {
  const response = await httpUtils.get(manifest.assetUrl, {
    configuration,
    headers: {
      accept: 'application/octet-stream',
      'user-agent': 'raijin-yarn-plugin-essentials',
    },
    jsonResponse: false,
  })

  if (Buffer.isBuffer(response)) {
    return response
  }

  if (typeof response === 'string') {
    return Buffer.from(response)
  }

  throw new Error('Invalid Raijin runtime asset response')
}

export const installRaijinRuntime = async (
  configuration: Configuration,
  cwd: string,
  manifest: RaijinRuntimeManifest
): Promise<void> => {
  const runtime = await downloadRaijinRuntime(configuration, manifest)
  const digest = createSha256Digest(runtime)

  if (digest !== manifest.sha256) {
    throw new Error(
      `Downloaded Raijin runtime digest mismatch: expected ${manifest.sha256}, got ${digest}`
    )
  }

  const yarnPath = getRaijinRuntimeYarnPath()
  const runtimePath = join(portableToNativePath(cwd), portableToNativePath(yarnPath))

  await mkdir(dirname(runtimePath), { recursive: true })
  await writeFile(runtimePath, runtime)
  await YarnConfiguration.updateConfiguration(
    cwd as ConfigurationUpdateCwd,
    {
      yarnPath,
    } as ConfigurationUpdate
  )
}

export const cleanupLegacyRaijinRuntimeFiles = async (cwd: string): Promise<void> => {
  const yarnPath = getRaijinRuntimeYarnPath()
  const runtimePath = join(portableToNativePath(cwd), portableToNativePath(yarnPath))
  const runtimeDirectory = dirname(runtimePath)
  const entries = await readDirectoryEntries(runtimeDirectory)

  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .filter((entry) => isLegacyRaijinRuntimeFileName(entry.name))
      .map(async (entry) => {
        await rm(join(runtimeDirectory, entry.name), { force: true })
      })
  )
}

export const resolveYarnPath = (cwd: string, yarnPath: string | null): string => {
  if (!yarnPath) {
    throw new Error('`yarnPath` is not set after Raijin runtime update')
  }

  const nativeYarnPath = portableToNativePath(yarnPath)

  return isAbsolute(nativeYarnPath)
    ? nativeYarnPath
    : join(portableToNativePath(cwd), nativeYarnPath)
}

export const assertInstalledRaijinRuntime = async (
  configuration: Configuration,
  cwd: string,
  manifest: RaijinRuntimeManifest
): Promise<void> => {
  const yarnPath = configuration.get('yarnPath') as string | null
  const runtimePath = resolveYarnPath(cwd, yarnPath)
  const digest = createSha256Digest(await readFile(runtimePath))

  if (digest !== manifest.sha256) {
    throw new Error(
      `Installed Raijin runtime digest mismatch: expected ${manifest.sha256}, got ${digest}`
    )
  }
}
