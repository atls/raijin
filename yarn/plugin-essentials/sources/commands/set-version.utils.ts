import { access }    from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { dirname }   from 'node:path'
import { join }      from 'node:path'

const PACKAGE_JSON = 'package.json'
const YARN_LOCK = 'yarn.lock'

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

export const findPackageCwd = async (cwd: string): Promise<string> => {
  if (await pathExists(join(cwd, PACKAGE_JSON))) {
    return cwd
  }

  const parentCwd = dirname(cwd)

  if (parentCwd === cwd) {
    return cwd
  }

  return findPackageCwd(parentCwd)
}

export const preparePackageProjectBoundary = async (cwd: string): Promise<void> => {
  const lockfilePath = join(cwd, YARN_LOCK)

  if (!(await pathExists(lockfilePath))) {
    await writeFile(lockfilePath, '')
  }
}
