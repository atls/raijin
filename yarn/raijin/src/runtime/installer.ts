import type { FetchLike }                       from './download.js'
import type { RaijinRuntimeManifest }           from './manifest.js'

import { randomUUID }                           from 'node:crypto'
import { mkdir }                                from 'node:fs/promises'
import { rename }                               from 'node:fs/promises'
import { rm }                                   from 'node:fs/promises'
import { writeFile }                            from 'node:fs/promises'
import { dirname }                              from 'node:path'
import { join }                                 from 'node:path'

import { RaijinRuntimeDigestMismatchException } from './exceptions/digest-mismatch.js'
import { writeBootstrapConfiguration }          from './bootstrap.js'
import { downloadRaijinRuntime }                from './download.js'
import { fetchRaijinRuntimeManifest }           from './download.js'
import { createSha256Digest }                   from './manifest.js'
import { getRaijinRuntimeYarnPath }             from './manifest.js'

export interface InstallRaijinRuntimeOptions {
  cwd: string
  fetchImpl: FetchLike
}

const TEMPORARY_RUNTIME_FILE_EXTENSION = '.tmp'

const writeRuntimeFileAtomically = async (runtimePath: string, runtime: Buffer): Promise<void> => {
  const temporaryRuntimePath = `${runtimePath}.${process.pid}.${randomUUID()}${TEMPORARY_RUNTIME_FILE_EXTENSION}`

  try {
    await writeFile(temporaryRuntimePath, runtime)
    await rename(temporaryRuntimePath, runtimePath)
  } catch (error) {
    await rm(temporaryRuntimePath, { force: true })

    throw error
  }
}

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

  const yarnPath = getRaijinRuntimeYarnPath()
  const runtimePath = join(cwd, yarnPath)

  await mkdir(dirname(runtimePath), { recursive: true })
  await writeRuntimeFileAtomically(runtimePath, runtime)
  await writeBootstrapConfiguration(cwd, yarnPath)

  return manifest
}
