export const TEST_EXEC_ARGV_ENV = 'RAIJIN_TEST_EXEC_ARGV'

export const createTestExecArgv = (pnpEsmLoader?: string): Array<string> => {
  const execArgv: Array<string> = []

  if (pnpEsmLoader) {
    execArgv.push('--loader', pnpEsmLoader)
  }

  execArgv.push('--loader', '@atls/code-runtime/typescript-loader')
  execArgv.push('--enable-source-maps')

  return execArgv
}

export const parseTestExecArgv = (value = process.env[TEST_EXEC_ARGV_ENV]): Array<string> => {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed
    }
  } catch {
    return []
  }

  return []
}
