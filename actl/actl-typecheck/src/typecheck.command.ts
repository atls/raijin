import { Command }       from 'clipanion'
import { writeFileSync } from 'fs'

import { TypeScript }    from '@atls/code-typescript'

class TypeCheckCommand extends Command {
  @Command.String('-r,--report')
  report: string

  @Command.Rest({ required: 0 })
  files: Array<string> = []

  @Command.Path(`typecheck`)
  async execute() {
    const ts = new TypeScript()

    const result = ts.check(this.files)

    if (this.report) {
      const report = Object.keys(result)
        .map((key) => result[key])
        .flat()
        .map((diagnostic) => ({
          messageText: diagnostic.messageText,
          category: diagnostic.category,
          file: diagnostic.file
            ? {
                position: diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!),
                fileName: diagnostic.file.fileName,
              }
            : null,
        }))

      writeFileSync(this.report, JSON.stringify(report, null, 2))
    }

    Object.values(result)
      .flat()
      .forEach((diagnostic) => {
        this.context.stdout.write(ts.formatDiagnostic(diagnostic))
        this.context.stdout.write('\n\n')
      })

    if (result.errors.length > 0) {
      process.exit(1)
    }
  }
}

export { TypeCheckCommand }
