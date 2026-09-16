import { access } from 'node:fs/promises'
import { chmod } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import husky from 'husky'

import { shouldSkipRepositoryHooks } from './skip.js'

const HOOKS_DIRECTORY = '.config/husky'
const OWNERSHIP_MARKER = '# Raijin-managed hook'
const HOOK_MODE = 0o755

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

/** @param {string} cwd */
export const installRepositoryHooks = async (cwd) => {
  if (shouldSkipRepositoryHooks()) return

  try {
    await access(join(cwd, '.git'))
  } catch (error) {
    if (isMissing(error)) return

    throw error
  }

  const target = join(cwd, HOOKS_DIRECTORY)
  const entries = /** @type {Array<[keyof typeof hooks, string]>} */ (Object.entries(hooks))

  await Promise.all(
    entries.map(async ([name]) => {
      try {
        const current = await readFile(join(target, name), 'utf8')

        if (!isRaijinOwned(name, current)) {
          throw new Error(`Cannot install Raijin hook ${name}: existing hook is not Raijin-owned`)
        }
      } catch (error) {
        if (!isMissing(error)) throw error
      }
    })
  )

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
