import commitlintConfigPath from '@atlantis-lab/config/commitlint.config.js'
import { Command }          from 'clipanion'

const execa = require('execa')

export default class CommitmsgCommand extends Command {
  static description: string = 'Run commitizen commit message validation hook'

  static paths = [['commitmsg']]

  async execute(): Promise<void> {
    try {
      await execa(
        'commitlint',
        [`--config=${commitlintConfigPath}`, `--edit=${process.env.HUSKY_GIT_PARAMS}`],
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
