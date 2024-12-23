import { platform }     from 'node:os'
import { arch }         from 'node:os'

import { PortablePath } from '@yarnpkg/fslib'
import { execUtils }    from '@yarnpkg/core'

interface InstallPackOptions {
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
    console.log('Buildpack CLI (pack) is not installed. Installing it...')

    let downloadUrl = 'https://github.com/buildpacks/pack/releases/download/v0.36.1/pack-v0.36.1-'

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
    }

    if (currentPlatform === 'linux') {
    }

    await execUtils.pipevp(
      'curl',
      ['-sSL', downloadUrl, '|', 'tar', '-C', '/usr/local/bin/', '--no-same-owner', '-xzv', 'pack'],
      {
        cwd: cwd ?? context.cwd,
        env: process.env,
        stdin: context.stdin,
        stdout: context.stdout,
        stderr: context.stderr,
        end: execUtils.EndStrategy.ErrorCode,
      }
    )

    console.log('Buildpack CLI (pack) has been installed.')
  }
}
