import { Command }       from 'clipanion'
import { Option }        from 'clipanion'
import { writeFileSync } from 'fs'

import { unit }          from '@atls/code-test'

class TestUnitCommand extends Command {
  static paths = [['test:unit']]

  updateSnapshot = Option.Boolean(`-u,--update-shapshot`, false)

  bail = Option.Boolean(`-b,--bail`, false)

  findRelatedTests = Option.Boolean(`--find-related-tests`, false)

  json = Option.Boolean(`--json`, false)

  report = Option.String('-r,--report')

  files: Array<string> = Option.Rest({ required: 0 })

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
