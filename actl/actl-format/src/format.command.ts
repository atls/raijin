import { Command }       from 'clipanion'
import { Option }        from 'clipanion'

import { formatProject } from '@atls/code-format'
import { formatFiles }   from '@atls/code-format'

class FormatCommand extends Command {
  static paths = [['format']]

  files: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    if (this.files.length > 0) {
      formatFiles(this.files)
    } else {
      formatProject()
    }
  }
}

export { FormatCommand }
