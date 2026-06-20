import { access }    from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { basename }  from 'node:path'
import { join }      from 'node:path'

const PACKAGE_JSON = 'package.json'
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

export const hasPackageJson = async (cwd: string): Promise<boolean> => {
  try {
    await access(join(cwd, PACKAGE_JSON))

    return true
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

export const ensurePackageJson = async (cwd: string): Promise<void> => {
  if (await hasPackageJson(cwd)) {
    return
  }

  await writeFile(
    join(cwd, PACKAGE_JSON),
    `${JSON.stringify({ name: getPackageName(cwd) }, null, 2)}\n`
  )
}
