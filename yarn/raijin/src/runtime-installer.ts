import type { InstallRaijinRuntimeOptions }     from './runtime-installer.interfaces.js'
import type { RaijinRuntimeManifest }           from './runtime.interfaces.js'

import { mkdir }                                from 'node:fs/promises'
import { writeFile }                            from 'node:fs/promises'
import { dirname }                              from 'node:path'
import { join }                                 from 'node:path'

import { RaijinRuntimeDigestMismatchException } from './exceptions.js'
import { writeYarnPathConfiguration }           from './bootstrap.js'
import { downloadRaijinRuntime }                from './runtime-download.js'
import { fetchRaijinRuntimeManifest }           from './runtime-download.js'
import { createSha256Digest }                   from './runtime.js'
import { getRaijinRuntimeYarnPath }             from './runtime.js'

export const installRaijinRuntime = async ({
  cwd,
  fetchImpl,
}: InstallRaijinRuntimeOptions): Promise<RaijinRuntimeManifest> => {
  const manifest = await fetchRaijinRuntimeManifest(fetchImpl)
  const runtime = await downloadRaijinRuntime(fetchImpl, manifest)
  const digest = createSha256Digest(runtime)

  if (digest !== manifest.sha256) {
    throw new RaijinRuntimeDigestMismatchException(manifest.sha256, digest)
  }

  const yarnPath = getRaijinRuntimeYarnPath(manifest)
  const runtimePath = join(cwd, yarnPath)

  await mkdir(dirname(runtimePath), { recursive: true })
  await writeFile(runtimePath, runtime)
  await writeYarnPathConfiguration(cwd, yarnPath)

  return manifest
}
