import { access }    from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { dirname }   from 'node:path'
import { join }      from 'node:path'

const PACKAGE_JSON = 'package.json'
const YARN_LOCK = 'yarn.lock'

const PACKAGE_CWD_NOT_FOUND_MESSAGE =
  'Package manifest was not found in current directory or its ancestors'

const WINDOWS_PORTABLE_ROOT = /^\/([A-Za-z]:)(?=\/|$)/
const WINDOWS_NATIVE_ROOT = /^([A-Za-z]:)(?=\/|$)/

export const portableToNativePath = (
  path: string,
  platform: NodeJS.Platform = process.platform
): string => {
  if (platform !== 'win32') {
    return path
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
