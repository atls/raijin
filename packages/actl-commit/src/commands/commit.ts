import { Command } from '@oclif/command'
import { bootstrap } from 'commitizen/dist/cli/git-cz'

export default class CommitCommand extends Command {
  static description: string = 'Create Commitizen commit from staged files'
  static examples: string[] = ['$ actl commit']

  async run(): Promise<void> {
    try {
      bootstrap({
        cliPath: require.resolve('commitizen/package.json').replace('package.json', ''),
        config: {
          path: require.resolve('cz-lerna-changelog'),
        },
      }, [null, ...this.argv]);
    }
    catch (error) {
      this.log(error.message);
      process.exit(1);
    }
  }
}
