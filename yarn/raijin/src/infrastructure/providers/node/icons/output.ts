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
import { rmdir }               from 'node:fs/promises'
import { writeFile }           from 'node:fs/promises'
import { join }                from 'node:path'

const GENERATED_MODULE_SUFFIX = '.icon.tsx'
const INDEX_FILE = 'index.ts'

type Snapshot = ReadonlyArray<Readonly<{ content: Buffer; name: string }>>

const isIndexFile = (name: string): boolean => name.toLowerCase() === INDEX_FILE

const isModuleFile = (name: string): boolean => name.toLowerCase().endsWith(GENERATED_MODULE_SUFFIX)

const isMissing = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'

const createIndex = (modules: ReadonlyArray<Module>): string =>
  modules.map((module) => `export * from './${module.name}.icon.jsx'`).join('\n')

const snapshot = async (directory: string, files: ReadonlyArray<string>): Promise<Snapshot> =>
  Promise.all(
    files.map(async (name) => {
      const path = join(directory, name)

      if (!(await lstat(path)).isFile()) {
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
  const removalResults = await Promise.allSettled(
    affectedFiles.map(async (file) => remove(join(directory, file)))
  )
  const restorationResults = await Promise.allSettled(
    state.map(async (entry) => writeFile(join(directory, entry.name), entry.content))
  )
  const failures: Array<unknown> = []

  for (const result of [...removalResults, ...restorationResults]) {
    if (result.status === 'rejected') {
      failures.push(result.reason as unknown)
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(failures, 'Icon output restoration failed')
  }
}

const removeCreatedBoundary = async (
  directory: string,
  affectedFiles: ReadonlyArray<string>,
  remove: RemoveFile
): Promise<void> => {
  const removalResults = await Promise.allSettled(
    affectedFiles.map(async (file) => remove(join(directory, file)))
  )
  const failures = removalResults
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => result.reason as unknown)

  try {
    await rmdir(directory)
  } catch (error) {
    failures.push(error)
  }

  if (failures.length > 0) {
    throw new AggregateError(failures, 'Icon output boundary restoration failed')
  }
}

const replace = async (
  cwd: string,
  modules: ReadonlyArray<Module>,
  copy: CopyFile,
  remove: RemoveFile
): Promise<Array<string>> => {
  const target = join(cwd, 'src')
  const moduleFiles = modules.map((module) => `${module.name}${GENERATED_MODULE_SUFFIX}`)
  const generatedFiles = [...moduleFiles, INDEX_FILE]
  let targetExists = true
  let previousFiles: Array<string>

  try {
    const targetEntry = await lstat(target)

    if (!targetEntry.isDirectory()) {
      throw new TypeError('Managed icon output boundary must be a directory: src')
    }

    previousFiles = await readdir(target)
  } catch (error) {
    if (!isMissing(error)) {
      throw error
    }

    targetExists = false
    previousFiles = []
  }

  const snapshotFiles = previousFiles.filter((file) => isIndexFile(file) || isModuleFile(file))
  const staleFiles = snapshotFiles.filter((file) => !generatedFiles.includes(file))
  const affectedFiles = Array.from(new Set([...snapshotFiles, ...generatedFiles]))
  const previousState = await snapshot(target, snapshotFiles)
  const staging = await mkdtemp(join(cwd, '.raijin-icons-'))

  try {
    await Promise.all(
      modules.map(async (module) =>
        writeFile(join(staging, `${module.name}${GENERATED_MODULE_SUFFIX}`), module.content))
    )
    await writeFile(join(staging, INDEX_FILE), createIndex(modules))

    let targetCreated = false

    try {
      if (!targetExists) {
        await mkdir(target)
        targetCreated = true
      }

      await settle(staleFiles.map(async (file) => remove(join(target, file))))

      await settle(
        generatedFiles.map(async (file) => copy(join(staging, file), join(target, file)))
      )
    } catch (error) {
      try {
        if (targetCreated) {
          await removeCreatedBoundary(target, affectedFiles, remove)
        } else if (targetExists) {
          await restore(target, affectedFiles, previousState, remove)
        }
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
