import { Command }       from 'clipanion'
import { Option }        from 'clipanion'
import { writeFileSync } from 'fs'

import { Linter }        from '@atls/code-lint'

class LintCommand extends Command {
  static paths = [['lint']]

  report = Option.String('-r,--report')

  files: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    const linter = new Linter()

    const results = this.files.length > 0 ? await linter.lintFiles(this.files) : await linter.lint()

    const output = await linter.format(results)

    if (this.report) {
      writeFileSync(this.report, JSON.stringify(results, null, 2))
    }

    if (output) {
      this.context.stdout.write(output)
    }

    process.exit(results.some((result) => result.errorCount > 0) ? 1 : 0)
  }
}

export { LintCommand }
