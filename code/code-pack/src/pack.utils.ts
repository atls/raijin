import type { PortablePath } from '@yarnpkg/fslib'

import { platform }          from 'node:os'
import { arch }              from 'node:os'

import { execUtils }         from '@yarnpkg/core'

interface InstallPackOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
  cwd?: PortablePath
}

type InstallPack = (options: InstallPackOptions) => Promise<void>

const PACK_VERSION = '0.40.4'

export const execOrThrow = async (
  command: string,
  args: Array<string>,
  options: Omit<execUtils.PipevpOptions, 'end'>
): Promise<void> => {
  const { code } = await execUtils.pipevp(command, args, {
    ...options,
    end: execUtils.EndStrategy.ErrorCode,
  })

  if (code !== 0) {
    throw new Error(`Command "${[command, ...args].join(' ')}" failed with exit code ${code}`)
  }
}

/**
 * Installs pack if not present
 */
export const installPack: InstallPack = async ({ context, cwd }) => {
  let isPackInstalled: boolean

  try {
    await execOrThrow('pack', ['--version'], {
      cwd: cwd ?? context.cwd,
      env: process.env,
      stdin: context.stdin,
      stdout: context.stdout,
      stderr: context.stderr,
    })

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

    const tempFile = `${cwd ?? context.cwd}/pack.tgz`

    await execOrThrow('curl', ['-sSL', '-o', tempFile, downloadUrl], {
      cwd: cwd ?? context.cwd,
      env: process.env,
      stdin: context.stdin,
      stdout: context.stdout,
      stderr: context.stderr,
    })

    await execOrThrow('tar', ['-C', '/usr/local/bin/', '--no-same-owner', '-xzv', tempFile], {
      cwd: cwd ?? context.cwd,
      env: process.env,
      stdin: context.stdin,
      stdout: context.stdout,
      stderr: context.stderr,
    })

    // eslint-disable-next-line no-console
    console.log('Buildpack CLI (pack) has been installed.')
  }
}
