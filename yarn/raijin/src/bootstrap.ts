import { readFile }  from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { join }      from 'node:path'

const YARNRC_PATH = '.yarnrc.yml'
const TOP_LEVEL_YARN_PATH_PATTERN = /^yarnPath:.*$/m

const readTextOrEmpty = async (path: string): Promise<string> => {
  try {
    return await readFile(path, 'utf-8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return ''
    }

    throw error
  }
}

export const updateYarnPathConfiguration = (content: string, yarnPath: string): string => {
  const yarnPathLine = `yarnPath: ${yarnPath}`
  const normalizedContent = content.trimEnd()

  if (TOP_LEVEL_YARN_PATH_PATTERN.test(normalizedContent)) {
    return `${normalizedContent.replace(TOP_LEVEL_YARN_PATH_PATTERN, yarnPathLine)}\n`
  }

  if (normalizedContent.length === 0) {
    return `${yarnPathLine}\n`
  }

  return `${normalizedContent}\n${yarnPathLine}\n`
}

export const writeYarnPathConfiguration = async (cwd: string, yarnPath: string): Promise<void> => {
  const yarnrcPath = join(cwd, YARNRC_PATH)
  const yarnrc = await readTextOrEmpty(yarnrcPath)

  await writeFile(yarnrcPath, updateYarnPathConfiguration(yarnrc, yarnPath))
}
