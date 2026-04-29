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

const isProjectSpecificLine = (line: string, templateLineSet: Set<string>): boolean =>
  line !== '' &&
  !templateLineSet.has(line) &&
  line !== PROJECT_SPECIFIC_START_MARKER &&
  line !== PROJECT_SPECIFIC_END_MARKER

const getTemplateBoundaryIndices = (
  lines: Array<string>,
  templateLines: Array<string>
): { firstMatchedIndex: number; lastMatchedIndex: number } => {
  let templateIndex = 0
  let firstMatchedIndex = -1
  let lastMatchedIndex = -1

  for (
    let lineIndex = 0;
    lineIndex < lines.length && templateIndex < templateLines.length;
    lineIndex += 1
  ) {
    if (lines[lineIndex] === templateLines[templateIndex]) {
      if (firstMatchedIndex === -1) {
        firstMatchedIndex = lineIndex
      }

      lastMatchedIndex = lineIndex
      templateIndex += 1
    }
  }

  return {
    firstMatchedIndex,
    lastMatchedIndex,
  }
}

const getProjectSpecificLines = (
  existingLines: Array<string>,
  templateLines: Array<string>,
  templateLineSet: Set<string>
): Array<string> => {
  const startIndex = existingLines.indexOf(PROJECT_SPECIFIC_START_MARKER)
  const endIndex = existingLines.indexOf(PROJECT_SPECIFIC_END_MARKER)

  if (startIndex !== -1 && endIndex > startIndex) {
    const linesBeforeBlock = existingLines.slice(0, startIndex)
    const linesAfterBlock = existingLines.slice(endIndex + 1)
    const managedProjectSpecificLines = existingLines
      .slice(startIndex + 1, endIndex)
      .filter((line) => isProjectSpecificLine(line, templateLineSet))
    const { firstMatchedIndex, lastMatchedIndex } = getTemplateBoundaryIndices(
      linesBeforeBlock,
      templateLines
    )
    const blockSeparatorIndex = linesBeforeBlock.lastIndexOf('')
    const removedTemplateTailLines: Array<string> = []
    const outsideBlockProjectSpecificLines: Array<string> = []

    linesBeforeBlock.forEach((line, lineIndex) => {
      if (!isProjectSpecificLine(line, templateLineSet)) {
        return
      }

      const isAfterSeparator = blockSeparatorIndex !== -1 && lineIndex > blockSeparatorIndex

      if (!isAfterSeparator && firstMatchedIndex !== -1 && lineIndex > lastMatchedIndex) {
        removedTemplateTailLines.push(line)

        return
      }

      outsideBlockProjectSpecificLines.push(line)
    })

    outsideBlockProjectSpecificLines.push(
      ...linesAfterBlock.filter((line) => isProjectSpecificLine(line, templateLineSet))
    )

    return Array.from(
      new Set([
        ...removedTemplateTailLines,
        ...managedProjectSpecificLines,
        ...outsideBlockProjectSpecificLines,
      ])
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

  const projectSpecificLines = getProjectSpecificLines(
    existingLines,
    templateLines,
    templateLineSet
  )

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
