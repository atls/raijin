import { readFile }  from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { join }      from 'node:path'

const YARNRC_PATH = '.yarnrc.yml'
const RAIJIN_NODE_LINKER = 'pnp'
const TOP_LEVEL_NODE_LINKER_PATTERN = /^nodeLinker:.*$/gm
const TOP_LEVEL_YARN_PATH_PATTERN = /^yarnPath:.*$/gm

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

const removeTopLevelLine = (content: string, pattern: RegExp): string =>
  content.replace(pattern, '').trim()

export const updateBootstrapConfiguration = (content: string, yarnPath: string): string => {
  const normalizedContent = content.trimEnd()
  const preservedContent = removeTopLevelLine(
    removeTopLevelLine(normalizedContent, TOP_LEVEL_NODE_LINKER_PATTERN),
    TOP_LEVEL_YARN_PATH_PATTERN
  )
  const configuration = [`nodeLinker: ${RAIJIN_NODE_LINKER}`, `yarnPath: ${yarnPath}`]

  if (preservedContent.length === 0) {
    return `${configuration.join('\n')}\n`
  }

  return `${preservedContent}\n${configuration.join('\n')}\n`
}

export const writeBootstrapConfiguration = async (cwd: string, yarnPath: string): Promise<void> => {
  const yarnrcPath = join(cwd, YARNRC_PATH)
  const yarnrc = await readTextOrEmpty(yarnrcPath)

  await writeFile(yarnrcPath, updateBootstrapConfiguration(yarnrc, yarnPath))
}
