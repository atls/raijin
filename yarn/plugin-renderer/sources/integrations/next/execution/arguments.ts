import { assertSupportedNextVersion } from './version.js'
import { shouldUseWebpackRoute }      from './version.js'

const APP_DIR = 'src'

export const createNextBuildArguments = (
  nextVersion: string | undefined,
  nextBin = 'next'
): Array<string> => {
  const args = ['node', nextBin, 'build']

  assertSupportedNextVersion(nextVersion)

  // TODO(atls/raijin#629): replace the explicit webpack renderer route with the
  // planned Turbopack contract once the Raijin v3 Next build stream owns it.
  if (shouldUseWebpackRoute(nextVersion)) {
    args.push('--webpack')
  }

  args.push(APP_DIR)

  return args
}

export const createNextDevArguments = (nextVersion: string | undefined): Array<string> => {
  const args = ['next', 'dev', APP_DIR]

  if (shouldUseWebpackRoute(nextVersion)) {
    args.push('--webpack')
  }

  return args
}

export const assertNextBuildExitCode = (code: number): void => {
  if (code !== 0) {
    throw new Error(`Renderer build failed with exit code ${code}`)
  }
}
