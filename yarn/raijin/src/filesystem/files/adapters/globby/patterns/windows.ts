const PORTABLE_DRIVE_PATTERN = /^(!*)\/([a-z]:\/)/i

export const normalize = (pattern: string): string =>
  pattern.replace(PORTABLE_DRIVE_PATTERN, '$1$2')
