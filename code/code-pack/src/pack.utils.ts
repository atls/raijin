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

/**
 * Installs pack if not present
 */
export const installPack: InstallPack = async ({ context, cwd }) => {
  let isPackInstalled = false

  try {
    await execUtils.pipevp('pack', ['--version'], {
      cwd: cwd ?? context.cwd,
      env: process.env,
      stdin: context.stdin,
      stdout: context.stdout,
      stderr: context.stderr,
      end: execUtils.EndStrategy.ErrorCode,
    })

    isPackInstalled = true
  } catch {
    isPackInstalled = false
  }

  if (!isPackInstalled) {
    // eslint-disable-next-line no-console
    console.log('Buildpack CLI (pack) is not installed. Installing it...')

    let downloadUrl = 'https://github.com/buildpacks/pack/releases/download/v0.36.2/pack-v0.36.2-'

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
        downloadUrl += 'linux.tgz'
        break
    }

    const tempFile = `${cwd ?? context.cwd}/pack.tgz`

    await execUtils.pipevp('curl', ['-sSL', '-o', tempFile, downloadUrl], {
      cwd: cwd ?? context.cwd,
      env: process.env,
      stdin: context.stdin,
      stdout: context.stdout,
      stderr: context.stderr,
      end: execUtils.EndStrategy.ErrorCode,
    })

    await execUtils.pipevp('tar', ['-C', '/usr/local/bin/', '--no-same-owner', '-xzv', tempFile], {
      cwd: cwd ?? context.cwd,
      env: process.env,
      stdin: context.stdin,
      stdout: context.stdout,
      stderr: context.stderr,
      end: execUtils.EndStrategy.ErrorCode,
    })

    // eslint-disable-next-line no-console
    console.log('Buildpack CLI (pack) has been installed.')
  }
}
