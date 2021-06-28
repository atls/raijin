import { Command } from 'clipanion'
import { Option }  from 'clipanion'
import execa       from 'execa'
import fs          from 'fs-extra'
import path        from 'path'

import { build }   from '@atls/code-service'

class RendererBuildCommand extends Command {
  static paths = [['renderer', 'build']]

  source? = Option.String(`-s,--source`)

  export = Option.Boolean('-e,--export', false)

  async execute() {
    await execa('yarn', ['next', 'build', 'src'], {
      cwd: this.source || process.cwd(),
      stdio: 'inherit',
    })

    if (this.export) {
      await execa('yarn', ['next', 'export', 'src', '-o', 'dist'], {
        cwd: this.source || process.cwd(),
        stdio: 'inherit',
      })
    } else {
      const { errors, warnings } = await build({ cwd: this.source || process.cwd() })

      errors.forEach((error) => {
        this.context.stdout.write(error.message)
      })

      warnings.forEach((warning) => {
        this.context.stdout.write(warning.message)
      })

      if (errors.length > 0) {
        process.exit(1)
      }

      await fs.copy(
        path.join(this.source || process.cwd(), 'src', '.next'),
        path.join(this.source || process.cwd(), 'dist', '.next')
      )
    }
  }
}

export { RendererBuildCommand }
