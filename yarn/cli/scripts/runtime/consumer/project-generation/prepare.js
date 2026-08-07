import { cp } from 'node:fs/promises'
import { rename } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixturePath = fileURLToPath(new URL('./fixture', import.meta.url))

/** @param {string} fixtureCwd */
export const prepareProjectGeneration = async (fixtureCwd) => {
  await cp(fixturePath, fixtureCwd, { recursive: true })

  await Promise.all(
    ['generated', 'invalid'].map(async (target) =>
      rename(
        join(fixtureCwd, 'packages', target, 'package.json.fixture'),
        join(fixtureCwd, 'packages', target, 'package.json')
      )
    )
  )

  return {
    generatedTarget: join(fixtureCwd, 'packages/generated'),
    invalidTarget: join(fixtureCwd, 'packages/invalid'),
  }
}
