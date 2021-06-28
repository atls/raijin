import { Command } from 'clipanion'
import { Option }  from 'clipanion'

import { build }   from '@atls/code-service'

class ServiceBuildCommand extends Command {
  static paths = [['service', 'build']]

  source = Option.String(`-s,--source`)

  async execute() {
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
  }
}

export { ServiceBuildCommand }
