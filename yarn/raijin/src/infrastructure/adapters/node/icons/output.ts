import type { IconModule }         from '../../../../application/generation/icons/index.js'
import type { IconOutputReplacer } from '../../../../application/generation/icons/index.js'
import type { CopyFile }           from './output.interfaces.js'

import { copyFile }                from 'node:fs/promises'
import { mkdir }                   from 'node:fs/promises'
import { mkdtemp }                 from 'node:fs/promises'
import { readFile }                from 'node:fs/promises'
import { readdir }                 from 'node:fs/promises'
import { rm }                      from 'node:fs/promises'
import { writeFile }               from 'node:fs/promises'
import { join }                    from 'node:path'

const GENERATED_MODULE_SUFFIX = '.icon.tsx'
const INDEX_FILE = 'index.ts'

type Snapshot = Map<string, Buffer | undefined>

const isNotFound = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

const readOptional = async (path: string): Promise<Buffer | undefined> => {
  try {
    return await readFile(path)
  } catch (error) {
    if (isNotFound(error)) {
      return undefined
    }

    throw error
  }
}

const createIndex = (modules: ReadonlyArray<IconModule>): string =>
  modules.map((module) => `export * from './${module.name}.icon.jsx'`).join('\n')

const snapshot = async (directory: string, files: ReadonlyArray<string>): Promise<Snapshot> =>
  new Map(
    await Promise.all(
      files.map(async (file) => [file, await readOptional(join(directory, file))] as const)
    )
  )

const restore = async (directory: string, state: Snapshot): Promise<void> => {
  await Promise.all(
    Array.from(state, async ([file, content]) => {
      const path = join(directory, file)

      if (content === undefined) {
        await rm(path, { force: true })
      } else {
        await writeFile(path, content)
      }
    })
  )
}

const settle = async (operations: ReadonlyArray<Promise<void>>): Promise<void> => {
  const results = await Promise.allSettled(operations)
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  )

  if (failure) {
    throw failure.reason
  }
}

const replace = async (
  cwd: string,
  modules: ReadonlyArray<IconModule>,
  copy: CopyFile
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

    const previousModules = (await readdir(target)).filter((file) =>
      file.endsWith(GENERATED_MODULE_SUFFIX))
    const staleModules = previousModules.filter((file) => !moduleFiles.includes(file))
    const affectedFiles = Array.from(new Set([...generatedFiles, ...staleModules]))
    const previousState = await snapshot(target, affectedFiles)

    try {
      await settle(
        generatedFiles.map(async (file) => copy(join(staging, file), join(target, file)))
      )

      await settle(staleModules.map(async (file) => rm(join(target, file))))
    } catch (error) {
      try {
        await restore(target, previousState)
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

export const create = (copy: CopyFile = copyFile): IconOutputReplacer => ({
  replace: async (cwd, modules) => replace(cwd, modules, copy),
})
