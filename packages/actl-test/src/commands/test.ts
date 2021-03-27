import execa                from 'execa'
import { JEST_CONFIG_PATH } from '@atlantis-lab/config'
import { Command }          from '@oclif/command'

export default class TestCommand extends Command {
  static description: string = 'Run tests via jest'

  static examples: string[] = ['$ actl test']

  async run(): Promise<void> {
    try {
      await execa('jest', ['--config', JEST_CONFIG_PATH, ...this.argv], {
        stdio: 'inherit',
      })
    } catch (error) {
      this.log(error.stderr)
      if (error.exitCode !== 0) {
        process.exit(error.exitCode === null ? 0 : error.exitCode)
      }
    }
  }
}
