import { Command }       from 'clipanion'
import { writeFileSync } from 'fs'

import { Linter }        from '@atls/code-lint'

class LintCommand extends Command {
  @Command.String('-r,--report')
  report: string

  @Command.Rest({ required: 0 })
  files: Array<string> = []

  @Command.Path(`lint`)
  async execute() {
    const linter = new Linter()

    const { results, errorCount } =
      this.files.length > 0 ? linter.lintFiles(this.files) : linter.lint()

    const output = linter.format(results)

    if (this.report) {
      writeFileSync(this.report, JSON.stringify(results, null, 2))
    }

    if (output) {
      this.context.stdout.write(output)
    }

    process.exit(errorCount ? 1 : 0)
  }
}

export { LintCommand }
