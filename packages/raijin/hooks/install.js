import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { chmod } from 'node:fs/promises'
import { lstat } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { realpath } from 'node:fs/promises'
import { stat } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import husky from 'husky'

import { shouldSkipRepositoryHooks } from './skip.js'

const HOOKS_DIRECTORY = '.config/husky'
const OWNERSHIP_MARKER = '# Raijin-managed hook'
const HOOK_MODE = 0o755
const execute = promisify(execFile)

const hooks = {
  'commit-msg': 'yarn commit message lint "$1"',
  'pre-commit': 'yarn commit staged',
  'prepare-commit-msg': 'yarn commit message "$@"',
}

const legacyHooks = {
  'commit-msg': 'yarn commit message lint\n',
  'pre-commit': 'yarn commit staged\n',
  'prepare-commit-msg': 'yarn commit message $@\n',
}

/** @param {unknown} error */
const isMissing = (error) => error instanceof Error && 'code' in error && error.code === 'ENOENT'

/** @param {string} command */
const hookContent = (command) => `${OWNERSHIP_MARKER}\n${command}\n`

/** @param {keyof typeof hooks} name @param {string} content */
const isRaijinOwned = (name, content) =>
  content.startsWith(`${OWNERSHIP_MARKER}\n`) || content === legacyHooks[name]

/** @param {string} path @param {boolean} allowRaijinEntries */
const findActiveForeignHook = async (path, allowRaijinEntries) => {
  let files

  try {
    files = await readdir(path, { withFileTypes: true })
  } catch (error) {
    if (isMissing(error)) return undefined

    throw error
  }

  const active = await Promise.all(
    files.map(async (file) => {
      if (file.name.startsWith('.') || file.name.endsWith('.sample')) return undefined
      if (!file.isFile() && !file.isSymbolicLink()) return undefined

      const details = await stat(join(path, file.name))

      // eslint-disable-next-line no-bitwise
      return (details.mode & 0o111) !== 0 ? file.name : undefined
    })
  )

  return active.find((name) => name && !(allowRaijinEntries && Object.hasOwn(hooks, name)))
}

/** @param {string} cwd */
export const installRepositoryHooks = async (cwd) => {
  if (shouldSkipRepositoryHooks()) return

  try {
    await access(join(cwd, '.git'))
  } catch (error) {
    if (isMissing(error)) return

    throw error
  }

  const target = join(await realpath(cwd), HOOKS_DIRECTORY)
  const entries = /** @type {Array<[keyof typeof hooks, string]>} */ (Object.entries(hooks))

  await Promise.all(
    entries.map(async ([name]) => {
      try {
        const path = join(target, name)
        const kind = await lstat(path)

        if (!kind.isFile()) {
          throw new Error(`Cannot install Raijin hook ${name}: existing hook is not Raijin-owned`)
        }

        const current = await readFile(path, 'utf8')

        if (!isRaijinOwned(name, current)) {
          throw new Error(`Cannot install Raijin hook ${name}: existing hook is not Raijin-owned`)
        }
      } catch (error) {
        if (!isMissing(error)) throw error
      }
    })
  )

  const { stdout } = await execute(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-path', 'hooks'],
    { cwd }
  )
  const currentHooksPath = resolve(stdout.replace(/\r?\n$/u, ''))
  const nativeHooksPath = resolve(target, '_')

  if (currentHooksPath !== nativeHooksPath) {
    const active = await findActiveForeignHook(currentHooksPath, currentHooksPath === target)

    if (active) {
      throw new Error(
        `Cannot install Raijin hooks: active existing hook ${active} would be disabled`
      )
    }
  }

  const previousCwd = process.cwd()

  try {
    process.chdir(cwd)
    const diagnostic = husky(HOOKS_DIRECTORY)

    if (diagnostic) throw new Error(`Husky installation failed: ${diagnostic.trim()}`)
  } finally {
    process.chdir(previousCwd)
  }

  await mkdir(target, { recursive: true })

  await Promise.all(
    entries.map(async ([name, command]) => {
      const path = join(target, name)
      const content = hookContent(command)

      try {
        if ((await readFile(path, 'utf8')) !== content) await writeFile(path, content)
      } catch (error) {
        if (!isMissing(error)) throw error

        await writeFile(path, content)
      }

      await chmod(path, HOOK_MODE)
    })
  )
}
