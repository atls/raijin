import type { RaijinRuntimeManifest }         from '@atls/raijin/runtime'
import type { Configuration }                 from '@yarnpkg/core'

import { mkdir }                              from 'node:fs/promises'
import { readFile }                           from 'node:fs/promises'
import { writeFile }                          from 'node:fs/promises'
import { dirname }                            from 'node:path'
import { isAbsolute }                         from 'node:path'
import { join }                               from 'node:path'

import { Configuration as YarnConfiguration } from '@yarnpkg/core'
import { httpUtils }                          from '@yarnpkg/core'

import { RAIJIN_RUNTIME_MANIFEST_URL }        from '@atls/raijin/runtime'
import { createSha256Digest }                 from '@atls/raijin/runtime'
import { getRaijinRuntimeYarnPath }           from '@atls/raijin/runtime'
import { parseRaijinRuntimeManifest }         from '@atls/raijin/runtime'

import { portableToNativePath }               from './set-version.utils.js'

type ConfigurationUpdate = Parameters<typeof YarnConfiguration.updateConfiguration>[1]
type ConfigurationUpdateCwd = Parameters<typeof YarnConfiguration.updateConfiguration>[0]

export const fetchRaijinRuntimeManifest = async (
  configuration: Configuration
): Promise<RaijinRuntimeManifest> =>
  parseRaijinRuntimeManifest(
    await httpUtils.get(RAIJIN_RUNTIME_MANIFEST_URL, {
      configuration,
      headers: {
        accept: 'application/json',
        'user-agent': 'raijin-yarn-plugin-essentials',
      },
      jsonResponse: true,
    })
  )

const downloadRaijinRuntime = async (
  configuration: Configuration,
  manifest: RaijinRuntimeManifest
): Promise<Buffer> => {
  const response = await httpUtils.get(manifest.assetUrl, {
    configuration,
    headers: {
      accept: 'application/octet-stream',
      'user-agent': 'raijin-yarn-plugin-essentials',
    },
    jsonResponse: false,
  })

  if (Buffer.isBuffer(response)) {
    return response
  }

  if (typeof response === 'string') {
    return Buffer.from(response)
  }

  throw new Error('Invalid Raijin runtime asset response')
}

export const installRaijinRuntime = async (
  configuration: Configuration,
  cwd: string,
  manifest: RaijinRuntimeManifest
): Promise<void> => {
  const runtime = await downloadRaijinRuntime(configuration, manifest)
  const digest = createSha256Digest(runtime)

  if (digest !== manifest.sha256) {
    throw new Error(
      `Downloaded Raijin runtime digest mismatch: expected ${manifest.sha256}, got ${digest}`
    )
  }

  const yarnPath = getRaijinRuntimeYarnPath()
  const runtimePath = join(portableToNativePath(cwd), portableToNativePath(yarnPath))

  await mkdir(dirname(runtimePath), { recursive: true })
  await writeFile(runtimePath, runtime)
  await YarnConfiguration.updateConfiguration(
    cwd as ConfigurationUpdateCwd,
    {
      yarnPath,
    } as ConfigurationUpdate
  )
}

export const resolveYarnPath = (cwd: string, yarnPath: string | null): string => {
  if (!yarnPath) {
    throw new Error('`yarnPath` is not set after Raijin runtime update')
  }

  const nativeYarnPath = portableToNativePath(yarnPath)

  return isAbsolute(nativeYarnPath)
    ? nativeYarnPath
    : join(portableToNativePath(cwd), nativeYarnPath)
}

export const assertInstalledRaijinRuntime = async (
  configuration: Configuration,
  cwd: string,
  manifest: RaijinRuntimeManifest
): Promise<void> => {
  const yarnPath = configuration.get('yarnPath') as string | null
  const runtimePath = resolveYarnPath(cwd, yarnPath)
  const digest = createSha256Digest(await readFile(runtimePath))

  if (digest !== manifest.sha256) {
    throw new Error(
      `Installed Raijin runtime digest mismatch: expected ${manifest.sha256}, got ${digest}`
    )
  }
}
