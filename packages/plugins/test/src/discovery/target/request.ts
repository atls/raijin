export const isNameRequest = (pattern: string): boolean => {
  const hasPathSeparator = pattern.includes('/') || pattern.includes('\\')
  const hasValidExtension = /\.(js|jsx|ts|tsx)$/.test(pattern)

  return !hasPathSeparator && !hasValidExtension
}

export const isGlobRequest = (pattern: string): boolean => /[*?[\]{}]/.test(pattern)
