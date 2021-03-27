import execa       from 'execa'
import { Command } from 'clipanion'
import { join }    from 'path'

export default class PrecommitCommand extends Command {
  // static description: string = 'Locally validate the repo before committing'
  // static examples: string[] = ['$ actl precommit']

  static paths = [['precommit']]

  async execute(): Promise<void> {
    try {
      await execa('lint-staged', ['--config', join(__dirname, '../config/lint-staged.config.js')], {
        stdio: 'inherit',
      })
    } catch (error) {
      this.context.stdout.write(`${error.stderr}`)
      if (error.exitCode !== 0) {
        process.exit(error.exitCode === null ? 0 : error.exitCode)
      }
    }
  }
}
