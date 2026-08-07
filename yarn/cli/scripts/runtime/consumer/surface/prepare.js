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
  ])

  return {
    fixtureCwd,
    targetWorkspaceCwd: join(fixtureCwd, 'packages/target'),
  }
}
