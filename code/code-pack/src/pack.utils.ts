import type { PortablePath }            from '@yarnpkg/fslib'

import type { CommandExecutionOptions } from './command.interfaces.js'
import type { CommandExecutionResult }  from './command.interfaces.js'
import type { CommandExecutor }         from './command.interfaces.js'

import { platform }                     from 'node:os'
import { arch }                         from 'node:os'

interface InstallPackOptions {
  commandExecutor: CommandExecutor
  cwd: PortablePath
}

type InstallPack = (options: InstallPackOptions) => Promise<void>

const PACK_VERSION = '0.40.4'

export const execOrThrow = async (
  commandExecutor: CommandExecutor,
  command: string,
  args: Array<string>,
  options?: CommandExecutionOptions
): Promise<CommandExecutionResult> => {
  const result = await commandExecutor.execute(command, args, options)

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
export const installPack: InstallPack = async ({ commandExecutor, cwd }) => {
  let isPackInstalled: boolean

  try {
    await execOrThrow(commandExecutor, 'pack', ['--version'])

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

    await execOrThrow(commandExecutor, 'curl', ['-sSL', '-o', tempFile, downloadUrl])

    await execOrThrow(commandExecutor, 'tar', [
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
