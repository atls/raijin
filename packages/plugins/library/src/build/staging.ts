import { randomUUID } from 'node:crypto'
import { mkdtemp }    from 'node:fs/promises'
import { mkdir }      from 'node:fs/promises'
import { rename }     from 'node:fs/promises'
import { rm }         from 'node:fs/promises'
import { basename }   from 'node:path'
import { dirname }    from 'node:path'
import { join }       from 'node:path'

type NodeError = Error & { code?: string }

const isMissing = (error: unknown): error is NodeError =>
  error instanceof Error && (error as NodeError).code === 'ENOENT'

export interface StagedLibraryArtifact {
  readonly root: string
  commit: () => Promise<void>
  dispose: () => Promise<void>
}

export const stageLibraryArtifact = async (targetRoot: string): Promise<StagedLibraryArtifact> => {
  const parent = dirname(targetRoot)

  await mkdir(parent, { recursive: true })

  const root = await mkdtemp(join(parent, `.${basename(targetRoot)}.raijin-library-`))
  const backup = join(parent, `.${basename(targetRoot)}.raijin-library-backup-${randomUUID()}`)
  let committed = false

  return {
    root,
    commit: async () => {
      let hasBackup = false

      try {
        await rename(targetRoot, backup)
        hasBackup = true
      } catch (error) {
        if (!isMissing(error)) throw error
      }

      try {
        await rename(root, targetRoot)
        committed = true
      } catch (error) {
        if (hasBackup) {
          try {
            await rename(backup, targetRoot)
          } catch (restoreError) {
            throw new AggregateError([error, restoreError], 'Unable to restore library artifact')
          }
        }

        throw error
      }

      if (hasBackup) await rm(backup, { force: true, recursive: true })
    },
    dispose: async () => {
      if (!committed) await rm(root, { force: true, recursive: true })
    },
  }
}
