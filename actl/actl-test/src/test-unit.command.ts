import { Command }       from 'clipanion'
import { writeFileSync } from 'fs'

import { unit }          from '@atls/code-test'

class TestUnitCommand extends Command {
  @Command.Boolean(`-u,--update-shapshot`)
  updateSnapshot: boolean = false

  @Command.Boolean(`-b,--bail`)
  bail: boolean = false

  @Command.Boolean(`--find-related-tests`)
  findRelatedTests: boolean = false

  @Command.Boolean(`--json`)
  json: boolean = false

  @Command.String('-r,--report')
  report: string

  @Command.Rest({ required: 0 })
  files: Array<string> = []

  @Command.Path(`test:unit`)
  async execute() {
    const { results } = await unit(
      process.cwd(),
      {
        findRelatedTests: this.findRelatedTests,
        updateSnapshot: this.updateSnapshot,
        bail: this.bail,
        silent: this.json,
      },
      this.files
    )

    if (this.report) {
      writeFileSync(this.report, JSON.stringify(results, null, 2))
    }

    if (this.json) {
      this.context.stdout.write(JSON.stringify(results))
    }
  }
}

export { TestUnitCommand }
