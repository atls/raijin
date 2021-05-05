import rimraf             from 'rimraf'
import { Command }        from 'clipanion'
import { promises as fs } from 'fs'

import { TypeScript }     from '@atls/code-typescript'

class LibraryBuildCommand extends Command {
  @Command.String(`-t,--target`)
  target: string = './dist'

  @Command.String(`-s,--source`)
  source?: string

  @Command.Path(`library`, `build`)
  async execute() {
    await this.cleanTarget()

    const ts = new TypeScript(this.source)

    const result = ts.build(['./src'], {
      module: 'commonjs' as any,
      outDir: this.target,
      declaration: true,
    })

    Object.values(result)
      .flat()
      .forEach((diagnostic) => {
        this.context.stdout.write(ts.formatDiagnostic(diagnostic))
      })

    if (result.errors.length > 0) {
      process.exit(1)
    }
  }

  protected async cleanTarget() {
    try {
      await fs.access(this.target)
    } catch {
      return
    }

    try {
      rimraf.sync(this.target)
      // eslint-disable-next-line
    } catch {}
  }
}

export { LibraryBuildCommand }
