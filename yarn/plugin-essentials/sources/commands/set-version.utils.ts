import { access }                 from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { dirname }                from 'node:path'
import { join }                   from 'node:path'

import { RAIJIN_PACKAGE_MANAGER } from '@atls/raijin/runtime'

interface PackageManifest extends Record<string, unknown> {
  packageManager?: string
}

const PACKAGE_JSON = 'package.json'
const YARN_LOCK = 'yarn.lock'

const PACKAGE_CWD_NOT_FOUND_MESSAGE =
  'Package manifest was not found in current directory or its ancestors'

const WINDOWS_PORTABLE_UNC_PREFIX = '/unc/'
const WINDOWS_PORTABLE_ROOT = /^\/([A-Za-z]:)(?=\/|$)/
const WINDOWS_NATIVE_ROOT = /^([A-Za-z]:)(?=\/|$)/

const splitPortableUncPath = (path: string): [string, string, string] | null => {
  if (!path.toLowerCase().startsWith(WINDOWS_PORTABLE_UNC_PREFIX)) {
    return null
  }

  const [server, share, ...tailParts] = path.slice(WINDOWS_PORTABLE_UNC_PREFIX.length).split('/')

  if (!server || !share) {
    return null
  }

  const tail = tailParts.length > 0 ? `/${tailParts.join('/')}` : ''

  return [server, share, tail]
}

const splitNativeUncPath = (path: string): [string, string, string] | null => {
  if (!path.startsWith('\\\\') && !path.startsWith('//')) {
    return null
  }

  const [server, share, ...tailParts] = path.slice(2).replace(/\\/g, '/').split('/')

  if (!server || !share) {
    return null
  }

  const tail = tailParts.length > 0 ? `/${tailParts.join('/')}` : ''

  return [server, share, tail]
}

export const portableToNativePath = (
  path: string,
  platform: NodeJS.Platform = process.platform
): string => {
  if (platform !== 'win32') {
    return path
  }

  const uncMatch = splitPortableUncPath(path)

  if (uncMatch) {
    const [server, share, tail] = uncMatch

    return `\\\\${server}\\${share}${tail.replace(/\//g, '\\')}`
  }

  return path.replace(WINDOWS_PORTABLE_ROOT, '$1').replace(/\//g, '\\')
}

export const nativeToPortablePath = (
  path: string,
  platform: NodeJS.Platform = process.platform
): string => {
  if (platform !== 'win32') {
    return path
  }

  const uncMatch = splitNativeUncPath(path)

  if (uncMatch) {
    const [server, share, tail] = uncMatch

    return `/unc/${server}/${share}${tail.replace(/\\/g, '/')}`
  }

  return path.replace(/\\/g, '/').replace(WINDOWS_NATIVE_ROOT, '/$1')
}

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

export const findPackageCwd = async (cwd: string): Promise<string> => {
  const nativeCwd = portableToNativePath(cwd)

  if (await pathExists(join(nativeCwd, PACKAGE_JSON))) {
    return cwd
  }

  const parentCwd = nativeToPortablePath(dirname(nativeCwd))

  if (parentCwd === cwd) {
    throw new Error(PACKAGE_CWD_NOT_FOUND_MESSAGE)
  }

  return findPackageCwd(parentCwd)
}

export const preparePackageProjectBoundary = async (cwd: string): Promise<void> => {
  const lockfilePath = join(portableToNativePath(cwd), YARN_LOCK)

  if (!(await pathExists(lockfilePath))) {
    await writeFile(lockfilePath, '')
  }
}

export const normalizePackageManager = async (cwd: string): Promise<void> => {
  const packageJsonPath = join(portableToNativePath(cwd), PACKAGE_JSON)
  const manifest = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as PackageManifest

  if (manifest.packageManager === RAIJIN_PACKAGE_MANAGER) {
    return
  }

  await writeFile(
    packageJsonPath,
    `${JSON.stringify({ ...manifest, packageManager: RAIJIN_PACKAGE_MANAGER }, null, 2)}\n`
  )
}
