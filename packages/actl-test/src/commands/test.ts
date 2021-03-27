import execa                from 'execa'
import { JEST_CONFIG_PATH } from '@atlantis-lab/config'
import { Command, Option }  from 'clipanion'

export default class TestCommand extends Command {
  // static description: string = 'Run tests via jest'
  //
  // static examples: string[] = ['$ actl test']

  static paths = [['test']]

  args = Option.Proxy()

  async execute(): Promise<void> {
    try {
      await execa('jest', ['--config', JEST_CONFIG_PATH, ...this.args], {
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
