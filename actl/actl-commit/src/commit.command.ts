import { Command }   from 'clipanion'
import { Option }    from 'clipanion'

import { bootstrap } from './bootstrap'

class CommitCommand extends Command {
  static paths = [['commit']]

  args: Array<string> = Option.Rest({ required: 0 })

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
