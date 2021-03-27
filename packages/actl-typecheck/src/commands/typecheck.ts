import execa       from 'execa'
import { Command } from 'clipanion'

export default class TypecheckCommand extends Command {
  static description: string = 'TypeScript typecheck'

  static paths = [['typecheck']]

  async execute(): Promise<void> {
    try {
      await execa('tsc', ['--noEmit', '-p', process.cwd()], {
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
