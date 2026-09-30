import type { TestScenario } from '../../interfaces/input.js'

import { basename }          from 'node:path'

export const resolveFolderPattern = (scenario: TestScenario): string => {
  if (scenario === 'general') {
    return '*'
  }

  return scenario === 'unit' ? '!(integration)' : 'integration'
}

export const createDirectoryPatterns = (
  folderPattern: string,
  scenario: TestScenario,
  targetPath: string
): Array<string> => {
  const directTestPattern = '*.test.{ts,tsx,js,jsx}'
  const nestedTestPattern = `**/${folderPattern}/${directTestPattern}`
  const targetFolder = basename(targetPath)

  if (scenario === 'general') {
    return [directTestPattern, `**/${directTestPattern}`]
  }

  if (scenario === 'integration') {
    return targetFolder === 'integration'
      ? [directTestPattern, nestedTestPattern]
      : [nestedTestPattern]
  }

  return targetFolder === 'integration'
    ? [nestedTestPattern]
    : [directTestPattern, nestedTestPattern]
}
