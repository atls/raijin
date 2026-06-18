import type { Configuration }   from '@yarnpkg/core'

import { createHash }           from 'node:crypto'
import { readFile }             from 'node:fs/promises'
import { isAbsolute }           from 'node:path'
import { join }                 from 'node:path'

import { httpUtils }            from '@yarnpkg/core'

import { portableToNativePath } from './set-version.utils.js'

const RAIJIN_RUNTIME_MANIFEST_URL =
  'https://raw.githubusercontent.com/atls/raijin/master/.yarn/releases/raijin-runtime.json'
const RAIJIN_RUNTIME_PACKAGE_NAME = '@atls/yarn-cli'
const RAIJIN_RUNTIME_ASSET_NAME = 'yarn.mjs'
const RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION = 1
const SHA256_PATTERN = /^[a-f0-9]{64}$/

export interface RaijinRuntimeManifest {
  assetName: string
  assetUrl: string
  packageName: string
  schemaVersion: number
  sha256: string
  tagName: string
  version: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const assertManifestString = (
  manifest: Record<string, unknown>,
  key: keyof RaijinRuntimeManifest
): string => {
  const value = manifest[key]

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid Raijin runtime manifest: missing ${key}`)
  }

  return value
}

export const parseRaijinRuntimeManifest = (value: unknown): RaijinRuntimeManifest => {
  if (!isRecord(value)) {
    throw new Error('Invalid Raijin runtime manifest: expected object')
  }

  if (value.schemaVersion !== RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION) {
    throw new Error('Invalid Raijin runtime manifest: unsupported schemaVersion')
  }

  const packageName = assertManifestString(value, 'packageName')
  const assetName = assertManifestString(value, 'assetName')
  const sha256 = assertManifestString(value, 'sha256')

  if (packageName !== RAIJIN_RUNTIME_PACKAGE_NAME) {
    throw new Error(`Invalid Raijin runtime manifest: expected ${RAIJIN_RUNTIME_PACKAGE_NAME}`)
  }

  if (assetName !== RAIJIN_RUNTIME_ASSET_NAME) {
    throw new Error(`Invalid Raijin runtime manifest: expected ${RAIJIN_RUNTIME_ASSET_NAME}`)
  }

  if (!SHA256_PATTERN.test(sha256)) {
    throw new Error('Invalid Raijin runtime manifest: invalid sha256')
  }

  return {
    assetName,
    assetUrl: assertManifestString(value, 'assetUrl'),
    packageName,
    schemaVersion: RAIJIN_RUNTIME_MANIFEST_SCHEMA_VERSION,
    sha256,
    tagName: assertManifestString(value, 'tagName'),
    version: assertManifestString(value, 'version'),
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

export const createSha256Digest = (data: Buffer): string =>
  createHash('sha256').update(data).digest('hex')

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
