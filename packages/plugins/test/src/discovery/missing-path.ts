export const isMissingPathError = (error: unknown): error is NodeJS.ErrnoException =>
  !!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
