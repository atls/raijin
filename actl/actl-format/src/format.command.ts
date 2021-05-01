import { Command }       from 'clipanion'

import { formatProject } from '@atls/code-format'
import { formatFiles }   from '@atls/code-format'

class FormatCommand extends Command {
  @Command.Rest({ required: 0 })
  files: Array<string> = []

  @Command.Path(`format`)
  async execute() {
    if (this.files.length > 0) {
      formatFiles(this.files)
    } else {
      formatProject()
    }
  }
}

export { FormatCommand }
