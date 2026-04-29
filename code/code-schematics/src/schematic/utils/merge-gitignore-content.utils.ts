type MergeGitIgnoreContentOptions = {
  existingContent: string
  templateContent: string
}

const trimTrailingEmptyLines = (lines: Array<string>): Array<string> => {
  const normalizedLines = [...lines]

  while (normalizedLines.length > 0 && normalizedLines[normalizedLines.length - 1] === '') {
    normalizedLines.pop()
  }

  return normalizedLines
}

export const mergeGitIgnoreContent = ({
  existingContent,
  templateContent,
}: MergeGitIgnoreContentOptions): string => {
  const templateLines = templateContent.split('\n')
  const templateLineSet = new Set(templateLines)
  const existingLines = existingContent.split('\n')

  const projectSpecificLines = existingLines.filter((line) => !templateLineSet.has(line))

  if (projectSpecificLines.length === 0) {
    return templateContent
  }

  const mergedLines = trimTrailingEmptyLines(templateLines)

  if (mergedLines.length > 0) {
    mergedLines.push('')
  }

  mergedLines.push(...projectSpecificLines)

  return mergedLines.join('\n')
}
