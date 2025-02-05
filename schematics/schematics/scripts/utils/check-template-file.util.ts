import { relative } from 'path'

const checkTemplatesDir = (relativePath: string): boolean => {
  return relativePath.split('/')[0] === 'templates'
}

export const checkTemplateFileUtil = (dir: string, file: string) => {
  const relativePath = relative(dir, file)
  return checkTemplatesDir(relativePath)
}
