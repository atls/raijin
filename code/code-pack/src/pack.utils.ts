import type { ProcessExecutionOptions } from '@atls/raijin/commands'
import type { ProcessExecutionResult }  from '@atls/raijin/commands'
import type { ProcessInvocation }       from '@atls/raijin/commands'
import type { PortablePath }            from '@yarnpkg/fslib'

import { platform }                     from 'node:os'
import { arch }                         from 'node:os'

interface InstallPackOptions {
  cwd: PortablePath
  processInvocation: ProcessInvocation
}

type InstallPack = (options: InstallPackOptions) => Promise<void>

const PACK_VERSION = '0.40.4'

export const execOrThrow = async (
  processInvocation: ProcessInvocation,
  command: string,
  args: Array<string>,
  options?: ProcessExecutionOptions
): Promise<ProcessExecutionResult> => {
  const result = await processInvocation.execute(command, args, options)

  if (result.exitCode !== 0) {
    throw new Error(
      `Command "${[command, ...args].join(' ')}" failed with exit code ${result.exitCode}`
    )
  }

  return result
}

/**
 * Installs pack if not present
 */
export const installPack: InstallPack = async ({ cwd, processInvocation }) => {
  let isPackInstalled: boolean

  try {
    await execOrThrow(processInvocation, 'pack', ['--version'])

    isPackInstalled = true
  } catch {
    isPackInstalled = false
  }

  if (!isPackInstalled) {
    // eslint-disable-next-line no-console
    console.log('Buildpack CLI (pack) is not installed. Installing it...')

    let downloadUrl = `https://github.com/buildpacks/pack/releases/download/v${PACK_VERSION}/pack-v${PACK_VERSION}-`

    const currentPlatform = platform()
    const currentArch = arch()

    switch (currentPlatform) {
      case 'linux':
        downloadUrl += 'linux.tgz'
        break
      case 'darwin':
        if (currentArch === 'arm64') {
          downloadUrl += 'macos-arm64.tgz'
        } else {
          downloadUrl += 'macos.tgz'
        }
        break
      default:
        break
    }

    const tempFile = `${cwd}/pack.tgz`

    await execOrThrow(processInvocation, 'curl', ['-sSL', '-o', tempFile, downloadUrl])

    await execOrThrow(processInvocation, 'tar', [
      '-C',
      '/usr/local/bin/',
      '--no-same-owner',
      '-xzv',
      tempFile,
    ])

    // eslint-disable-next-line no-console
    console.log('Buildpack CLI (pack) has been installed.')
  }
}
