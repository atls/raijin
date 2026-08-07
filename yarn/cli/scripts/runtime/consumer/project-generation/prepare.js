import { cp } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixturePath = fileURLToPath(new URL('./fixture', import.meta.url))

/** @param {string} fixtureCwd */
export const prepareProjectGeneration = async (fixtureCwd) => {
  await cp(fixturePath, fixtureCwd, { recursive: true })

  return {
    generatedTarget: join(fixtureCwd, 'packages/generated'),
    invalidTarget: join(fixtureCwd, 'packages/invalid'),
  }
}
