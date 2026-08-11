import type { Module }         from '../../../../application/icons/generation/index.js'
import type { OutputReplacer } from '../../../../application/icons/generation/index.js'
import type { CopyFile }       from './output.interfaces.js'
import type { RemoveFile }     from './output.interfaces.js'

import { copyFile }            from 'node:fs/promises'
import { lstat }               from 'node:fs/promises'
import { mkdir }               from 'node:fs/promises'
import { mkdtemp }             from 'node:fs/promises'
import { readFile }            from 'node:fs/promises'
import { readdir }             from 'node:fs/promises'
import { rm }                  from 'node:fs/promises'
import { writeFile }           from 'node:fs/promises'
import { join }                from 'node:path'

const GENERATED_MODULE_SUFFIX = '.icon.tsx'
const INDEX_FILE = 'index.ts'

type Snapshot = ReadonlyArray<Readonly<{ content: Buffer; name: string }>>

const createIndex = (modules: ReadonlyArray<Module>): string =>
  modules.map((module) => `export * from './${module.name}.icon.jsx'`).join('\n')

const snapshot = async (directory: string, files: ReadonlyArray<string>): Promise<Snapshot> =>
  Promise.all(
    files.map(async (name) => {
      const path = join(directory, name)

      if ((await lstat(path)).isSymbolicLink()) {
        throw new TypeError(`Managed icon output path must be a regular file: ${name}`)
      }

      return { content: await readFile(path), name }
    })
  )

const settle = async (operations: ReadonlyArray<Promise<void>>): Promise<void> => {
  const results = await Promise.allSettled(operations)
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  )

  if (failure) {
    throw failure.reason
  }
}

const restore = async (
  directory: string,
  affectedFiles: ReadonlyArray<string>,
  state: Snapshot,
  remove: RemoveFile
): Promise<void> => {
  await settle(affectedFiles.map(async (file) => remove(join(directory, file))))
  await Promise.all(
    state.map(async (entry) => writeFile(join(directory, entry.name), entry.content))
  )
}

const replace = async (
  cwd: string,
  modules: ReadonlyArray<Module>,
  copy: CopyFile,
  remove: RemoveFile
): Promise<Array<string>> => {
  const target = join(cwd, 'src')
  const staging = await mkdtemp(join(cwd, '.raijin-icons-'))
  const moduleFiles = modules.map((module) => `${module.name}${GENERATED_MODULE_SUFFIX}`)
  const generatedFiles = [...moduleFiles, INDEX_FILE]

  try {
    await mkdir(target, { recursive: true })

    await Promise.all(
      modules.map(async (module) =>
        writeFile(join(staging, `${module.name}${GENERATED_MODULE_SUFFIX}`), module.content))
    )
    await writeFile(join(staging, INDEX_FILE), createIndex(modules))

    const previousFiles = await readdir(target)
    const previousModules = previousFiles.filter((file) => file.endsWith(GENERATED_MODULE_SUFFIX))
    const staleModules = previousModules.filter((file) => !moduleFiles.includes(file))
    const snapshotFiles = previousFiles.filter(
      (file) => file === INDEX_FILE || file.endsWith(GENERATED_MODULE_SUFFIX)
    )
    const affectedFiles = Array.from(new Set([...snapshotFiles, ...generatedFiles]))
    const previousState = await snapshot(target, snapshotFiles)

    try {
      await settle(staleModules.map(async (file) => remove(join(target, file))))

      await settle(
        generatedFiles.map(async (file) => copy(join(staging, file), join(target, file)))
      )
    } catch (error) {
      try {
        await restore(target, affectedFiles, previousState, remove)
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], 'Icon output replacement rollback failed')
      }

      throw error
    }

    return generatedFiles.map((file) => `src/${file}`)
  } finally {
    await rm(staging, { force: true, recursive: true })
  }
}

export const create = (
  copy: CopyFile = copyFile,
  remove: RemoveFile = async (path) => rm(path, { force: true })
): OutputReplacer => ({
  replace: async (cwd, modules) => replace(cwd, modules, copy, remove),
})
