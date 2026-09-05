import { execFile } from 'node:child_process'
import { cp } from 'node:fs/promises'
import { rename } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const fixturePath = fileURLToPath(new URL('./fixture', import.meta.url))

/** @param {string} fixtureCwd */
export const prepareStagedProjects = async (fixtureCwd) => {
  await cp(fixturePath, fixtureCwd, { recursive: true })
  await Promise.all([
    rename(join(fixtureCwd, 'yarnrc.yml.fixture'), join(fixtureCwd, '.yarnrc.yml')),
    rename(
      join(fixtureCwd, 'lint-staged.config.mjs.fixture'),
      join(fixtureCwd, 'lint-staged.config.mjs')
    ),
    rename(
      join(fixtureCwd, 'backend/value with spaces.ts.fixture'),
      join(fixtureCwd, 'backend/value with spaces.ts')
    ),
    rename(
      join(fixtureCwd, 'backend/value.test.js.fixture'),
      join(fixtureCwd, 'backend/value.test.js')
    ),
    rename(
      join(fixtureCwd, 'client/package.json.fixture'),
      join(fixtureCwd, 'client/package.json')
    ),
    rename(join(fixtureCwd, 'client/yarnrc.yml.fixture'), join(fixtureCwd, 'client/.yarnrc.yml')),
    rename(
      join(fixtureCwd, 'client/lint-staged.config.mjs.fixture'),
      join(fixtureCwd, 'client/lint-staged.config.mjs')
    ),
    rename(
      join(fixtureCwd, 'client/src/value with spaces.ts.fixture'),
      join(fixtureCwd, 'client/src/value with spaces.ts')
    ),
    rename(
      join(fixtureCwd, 'client/src/value.test.js.fixture'),
      join(fixtureCwd, 'client/src/value.test.js')
    ),
  ])

  /** @param {Array<string>} args */
  const git = (args) => execFileAsync('git', args, { cwd: fixtureCwd })

  await git(['init', '--quiet'])
  await git(['config', 'user.name', 'Raijin Consumer'])
  await git(['config', 'user.email', 'raijin-consumer@example.invalid'])
  await git(['config', 'commit.gpgsign', 'false'])
  await git(['config', 'core.hooksPath', '.git/hooks'])
  await git(['add', '--all'])
  await git(['commit', '--quiet', '--no-verify', '-m', 'test: prepare staged projects'])
}
