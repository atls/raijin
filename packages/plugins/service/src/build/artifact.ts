import { randomUUID } from 'node:crypto'
import { access }     from 'node:fs/promises'
import { mkdtemp }    from 'node:fs/promises'
import { readFile }   from 'node:fs/promises'
import { rename }     from 'node:fs/promises'
import { rm }         from 'node:fs/promises'
import { writeFile }  from 'node:fs/promises'
import { join }       from 'node:path'

const ARTIFACT_DIRECTORY = 'dist'
const DESCRIPTOR_FILE = '.raijin-build.json'
const ENTRY_FILE = 'index.js'

type NodeError = Error & { code?: string }

const isMissing = (error: unknown): error is NodeError =>
  error instanceof Error && (error as NodeError).code === 'ENOENT'

export interface StagedArtifact {
  readonly path: string
  commit: () => Promise<string>
  dispose: () => Promise<void>
}

export const stageArtifact = async (cwd: string): Promise<StagedArtifact> => {
  const path = await mkdtemp(join(cwd, '.raijin-service-build-'))
  const target = join(cwd, ARTIFACT_DIRECTORY)
  const backup = join(cwd, `.raijin-service-backup-${randomUUID()}`)
  let committed = false

  return {
    path,
    commit: async () => {
      await writeFile(join(path, DESCRIPTOR_FILE), `${JSON.stringify({ entry: ENTRY_FILE })}\n`)

      let hasBackup = false

      try {
        await rename(target, backup)
        hasBackup = true
      } catch (error) {
        if (!isMissing(error)) {
          throw error
        }
      }

      try {
        await rename(path, target)
        committed = true
      } catch (error) {
        if (hasBackup) {
          await rename(backup, target)
        }

        throw error
      }

      if (hasBackup) {
        await rm(backup, { recursive: true, force: true })
      }

      return join(target, ENTRY_FILE)
    },
    dispose: async () => {
      if (!committed) {
        await rm(path, { recursive: true, force: true })
      }
    },
  }
}

export const resolveCompletedArtifact = async (cwd: string): Promise<string | null> => {
  const directory = join(cwd, ARTIFACT_DIRECTORY)

  try {
    const descriptor = JSON.parse(await readFile(join(directory, DESCRIPTOR_FILE), 'utf-8')) as {
      entry?: unknown
    }

    if (descriptor.entry !== ENTRY_FILE) {
      return null
    }

    const entry = join(directory, ENTRY_FILE)

    await access(entry)

    return entry
  } catch {
    return null
  }
}
