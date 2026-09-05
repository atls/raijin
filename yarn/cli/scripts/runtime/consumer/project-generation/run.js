import { join } from 'node:path'

import { verifyProjectGeneration } from './verify.js'

/**
 * @param {{
 *   fixtureCwd: string,
 *   runYarn: (args: Array<string>, cwd?: string) => Promise<string>
 * }} options
 */
export const runProjectGeneration = async ({ fixtureCwd, runYarn }) => {
  const generatedTarget = join(fixtureCwd, 'packages/generated')
  const invalidTarget = join(fixtureCwd, 'packages/invalid')
  const output = await runYarn(['generate', 'project', '--type', 'project'], generatedTarget)

  if (!output.includes('CREATE /eslint.config.mjs')) {
    throw new Error(`Project generation did not report generated changes: ${output}`)
  }

  try {
    await runYarn(['generate', 'project', '--type', 'service'], invalidTarget)
    throw new Error('Invalid project scaffold type unexpectedly succeeded')
  } catch (error) {
    const commandError = typeof error === 'object' && error !== null ? error : {}
    const errorOutput = `${
      'stdout' in commandError ? String(commandError.stdout ?? '') : ''
    }${'stderr' in commandError ? String(commandError.stderr ?? '') : ''}`

    if (!errorOutput.includes('Unsupported project scaffold type "service"')) {
      throw error
    }
  }

  await verifyProjectGeneration(generatedTarget)

  await runYarn(['generate', 'project', '--type', 'library'], generatedTarget)
  await verifyProjectGeneration(generatedTarget)
}
