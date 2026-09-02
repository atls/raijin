export const isFilenameTarget = (pattern: string): boolean => {
  const hasPathSeparator = pattern.includes('/') || pattern.includes('\\')
  const hasValidExtension = /\.(js|jsx|ts|tsx)$/.test(pattern)

  return !hasPathSeparator && !hasValidExtension
}

export const isGlobTarget = (pattern: string): boolean => /[*?[\]{}]/.test(pattern)
