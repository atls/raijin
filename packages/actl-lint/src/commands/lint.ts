import { Command } from '@oclif/command'
import execa from 'execa'
import {
  ESLINT_CONFIG_PATH,
  ESLINT_IGNORE_PATH,
} from '@atlantis-lab/config'

export default class LintCommand extends Command {
  static description: string = 'Run ESLint to statically analyze your code'
  static examples: string[] = ['$ actl lint']

  async run(): Promise<void> {
    try {
      await execa('eslint', [
        '--ext',
        'js,ts,jsx,tsx',
        process.cwd(),
        '--config',
        ESLINT_CONFIG_PATH,
        '--ignore-path',
        ESLINT_IGNORE_PATH,
        ...this.argv,
      ], { stdio: 'inherit' });
    }
    catch (error) {
      this.log(error.stderr);
      if (error.exitCode !== 0) {
        process.exit(error.exitCode === null ? 0 : error.exitCode);
      }
    }
  }
}
