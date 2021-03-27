import execa                                      from 'execa'
import { ESLINT_CONFIG_PATH, ESLINT_IGNORE_PATH } from '@atlantis-lab/config'
import { Command, Option }                        from 'clipanion'

export default class LintCommand extends Command {
  static description = 'Run ESLint to statically analyze your code'

  static paths = [['lint']]

  args = Option.Proxy()

  async execute(): Promise<void> {
    try {
      await execa(
        'eslint',
        [
          '--ext',
          'js,ts,jsx,tsx',
          process.cwd(),
          '--config',
          ESLINT_CONFIG_PATH,
          '--ignore-path',
          ESLINT_IGNORE_PATH,
          ...this.args,
        ],
        { stdio: 'inherit' },
      )
    } catch (error) {
      this.context.stdout.write(`${error.stderr}`)
      if (error.exitCode !== 0) {
        process.exit(error.exitCode === null ? 0 : error.exitCode)
      }
    }
  }
}
