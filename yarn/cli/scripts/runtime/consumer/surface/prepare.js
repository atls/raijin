import { cp } from 'node:fs/promises'
import { rename } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixturePath = fileURLToPath(new URL('./fixture', import.meta.url))

/** @param {string} fixtureCwd */
export const prepareSurface = async (fixtureCwd) => {
  await cp(fixturePath, fixtureCwd, { recursive: true })
  await Promise.all([
    rename(join(fixtureCwd, 'prettierrc.mjs.fixture'), join(fixtureCwd, '.prettierrc.mjs')),
    rename(join(fixtureCwd, 'source.ts.fixture'), join(fixtureCwd, 'source.ts')),
    rename(
      join(fixtureCwd, 'prettier-config/package.json.fixture'),
      join(fixtureCwd, 'prettier-config/package.json')
    ),
    ...['sibling', 'target'].map(async (workspace) =>
      rename(
        join(fixtureCwd, 'packages', workspace, 'package.json.fixture'),
        join(fixtureCwd, 'packages', workspace, 'package.json')
      )
    ),
    rename(
      join(fixtureCwd, 'packages/sibling/src/sibling.test.js.fixture'),
      join(fixtureCwd, 'packages/sibling/src/sibling.test.js')
    ),
    rename(
      join(fixtureCwd, 'packages/target/src/target.test.js.fixture'),
      join(fixtureCwd, 'packages/target/src/target.test.js')
    ),
    rename(
      join(fixtureCwd, 'packages/target/src/integration/target.test.js.fixture'),
      join(fixtureCwd, 'packages/target/src/integration/target.test.js')
    ),
  ])

  return {
    fixtureCwd,
    targetWorkspaceCwd: join(fixtureCwd, 'packages/target'),
  }
}
