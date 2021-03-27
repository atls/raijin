import execa       from 'execa'
import { Command } from '@oclif/command'

export default class TypecheckCommand extends Command {
  static description: string = 'TypeScript typecheck'

  static examples: string[] = ['$ actl typecheck']

  async run(): Promise<void> {
    try {
      await execa('tsc', ['--noEmit', '-p', process.cwd()], {
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
