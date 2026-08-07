import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * @param {{
 *   fixtureCwd: string,
 *   targetWorkspaceCwd: string,
 *   runYarn: (args: Array<string>, cwd?: string) => Promise<string>
 * }} options
 */
export const runSurface = async ({ fixtureCwd, targetWorkspaceCwd, runYarn }) => {
  const commands = [
    ['check', '--help'],
    ['generate', 'project', '--help'],
    ['raijin', 'sync', '--help'],
  ]

  await Promise.all(
    commands.map(async (command) => {
      const output = await runYarn(command)

      if (!output.includes(`yarn ${command.slice(0, -1).join(' ')}`)) {
        throw new Error(`Disposable consumer did not expose "${command.slice(0, -1).join(' ')}"`)
      }
    })
  )

  await runYarn(['format', 'source.ts'])

  const formattedSource = await readFile(join(fixtureCwd, 'source.ts'), 'utf8')

  if (formattedSource !== 'export const value = "test";\n') {
    throw new Error(`Disposable consumer ignored its PnP Prettier config: ${formattedSource}`)
  }

  const testScenarios = [
    {
      args: ['test', '--test-reporter=tap'],
      expected: ['fixture-target-unit', 'fixture-target-integration'],
    },
    { args: ['test', 'unit', '--test-reporter=tap'], expected: ['fixture-target-unit'] },
    {
      args: ['test', 'integration', '--test-reporter=tap'],
      expected: ['fixture-target-integration'],
    },
  ]

  await Promise.all(
    testScenarios.map(async (scenario) => {
      const output = await runYarn(scenario.args, targetWorkspaceCwd)

      for (const expected of scenario.expected) {
        if (!output.includes(expected)) {
          throw new Error(`Disposable consumer did not run ${expected}: ${output}`)
        }
      }

      if (output.includes('fixture-sibling-must-not-run')) {
        throw new Error(`Disposable consumer escaped the invocation workspace: ${output}`)
      }
    })
  )
}
