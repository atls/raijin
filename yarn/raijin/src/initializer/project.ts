import { access }                 from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { basename }               from 'node:path'
import { join }                   from 'node:path'

import { RAIJIN_PACKAGE_MANAGER } from '../runtime/package-manager.js'

interface PackageManifest extends Record<string, unknown> {
  packageManager?: string
}

const PACKAGE_JSON = 'package.json'
const YARN_LOCK = 'yarn.lock'
const FALLBACK_PACKAGE_NAME = 'raijin-project'
const INVALID_PACKAGE_NAME_CHARS_PATTERN = /[^a-z0-9._~-]+/g
const PACKAGE_NAME_EDGE_DASHES_PATTERN = /^-+|-+$/g

export const getPackageName = (cwd: string): string => {
  const packageName = basename(cwd)
    .toLowerCase()
    .replace(INVALID_PACKAGE_NAME_CHARS_PATTERN, '-')
    .replace(PACKAGE_NAME_EDGE_DASHES_PATTERN, '')

  return packageName || FALLBACK_PACKAGE_NAME
}

const hasProjectFile = async (cwd: string, fileName: string): Promise<boolean> => {
  try {
    await access(join(cwd, fileName))

    return true
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

export const hasPackageJson = async (cwd: string): Promise<boolean> =>
  hasProjectFile(cwd, PACKAGE_JSON)

export const hasYarnLock = async (cwd: string): Promise<boolean> => hasProjectFile(cwd, YARN_LOCK)

const writePackageManifest = async (cwd: string, manifest: PackageManifest): Promise<void> => {
  await writeFile(join(cwd, PACKAGE_JSON), `${JSON.stringify(manifest, null, 2)}\n`)
}

export const ensurePackageManifest = async (cwd: string): Promise<void> => {
  if (!(await hasPackageJson(cwd))) {
    await writePackageManifest(cwd, {
      name: getPackageName(cwd),
      packageManager: RAIJIN_PACKAGE_MANAGER,
    })

    return
  }

  const manifest = JSON.parse(await readFile(join(cwd, PACKAGE_JSON), 'utf-8')) as PackageManifest

  if (manifest.packageManager === RAIJIN_PACKAGE_MANAGER) {
    return
  }

  await writePackageManifest(cwd, {
    ...manifest,
    packageManager: RAIJIN_PACKAGE_MANAGER,
  })
}

export const ensureYarnLock = async (cwd: string): Promise<void> => {
  if (await hasYarnLock(cwd)) {
    return
  }

  await writeFile(join(cwd, YARN_LOCK), '')
}
