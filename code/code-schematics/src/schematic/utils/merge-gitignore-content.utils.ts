type MergeGitIgnoreContentOptions = {
  existingContent: string
  templateContent: string
}

const PROJECT_SPECIFIC_START_MARKER = '# raijin:begin project-specific gitignore'
const PROJECT_SPECIFIC_END_MARKER = '# raijin:end project-specific gitignore'

const normalizeContent = (content: string): string => content.replace(/\r\n/g, '\n')

const getNormalizedLines = (content: string): Array<string> => normalizeContent(content).split('\n')

const trimTrailingEmptyLines = (lines: Array<string>): Array<string> => {
  const normalizedLines = [...lines]

  while (normalizedLines.length > 0 && normalizedLines[normalizedLines.length - 1] === '') {
    normalizedLines.pop()
  }

  return normalizedLines
}

const getProjectSpecificLines = (
  existingLines: Array<string>,
  templateLineSet: Set<string>
): Array<string> => {
  const startIndex = existingLines.indexOf(PROJECT_SPECIFIC_START_MARKER)
  const endIndex = existingLines.indexOf(PROJECT_SPECIFIC_END_MARKER)

  if (startIndex !== -1 && endIndex > startIndex) {
    const linesBeforeBlock = existingLines.slice(0, startIndex)
    const linesAfterBlock = existingLines.slice(endIndex + 1)

    const blockSeparatorIndex = linesBeforeBlock.lastIndexOf('')

    const userLinesBeforeBlock =
      blockSeparatorIndex >= 0 ? linesBeforeBlock.slice(blockSeparatorIndex + 1) : []

    const outsideBlockProjectSpecificLines = [...userLinesBeforeBlock, ...linesAfterBlock].filter(
      (line) => line !== '' && !templateLineSet.has(line)
    )

    const managedProjectSpecificLines = trimTrailingEmptyLines(
      existingLines.slice(startIndex + 1, endIndex)
    )

    return Array.from(
      new Set([...managedProjectSpecificLines, ...outsideBlockProjectSpecificLines])
    )
  }

  return existingLines.filter((line) => !templateLineSet.has(line))
}

export const mergeGitIgnoreContent = ({
  existingContent,
  templateContent,
}: MergeGitIgnoreContentOptions): string => {
  const templateLines = getNormalizedLines(templateContent)
  const templateLineSet = new Set(templateLines)
  const existingLines = getNormalizedLines(existingContent)

  const projectSpecificLines = getProjectSpecificLines(existingLines, templateLineSet)

  if (projectSpecificLines.length === 0) {
    return trimTrailingEmptyLines(templateLines).join('\n')
  }

  const mergedLines = trimTrailingEmptyLines(templateLines)

  if (mergedLines.length > 0) {
    mergedLines.push('')
  }

  mergedLines.push(PROJECT_SPECIFIC_START_MARKER)
  mergedLines.push(...projectSpecificLines)
  mergedLines.push(PROJECT_SPECIFIC_END_MARKER)

  return mergedLines.join('\n')
}
