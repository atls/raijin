import { Command, Option } from 'clipanion'
import { bootstrap }       from 'commitizen/dist/cli/git-cz'

export default class CommitCommand extends Command {
  static description: string = 'Create Commitizen commit from staged files'

  static paths = [['commit']]

  args = Option.Proxy()

  async execute(): Promise<void> {
    try {
      bootstrap(
        {
          cliPath: require.resolve('commitizen/package.json').replace('package.json', ''),
          config: {
            path: require.resolve('cz-lerna-changelog'),
          },
        },
        [null, ...this.args],
      )
    } catch (error) {
      this.context.stdout.write(`${error.message}`)
      process.exit(1)
    }
  }
}
