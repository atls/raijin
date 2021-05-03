import { Command }   from 'clipanion'
import { bootstrap } from './bootstrap'

class CommitCommand extends Command {
  @Command.Rest({ required: 0 })
  args: Array<string> = []

  @Command.Path(`commit`)
  async execute() {
    try {
      await bootstrap(this.args)
    } catch (error) {
      this.context.stdout.write(error.message)

      process.exit(1)
    }
  }
}

export { CommitCommand }
