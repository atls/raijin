import execa                  from 'execa'
import { Command, Option }    from 'clipanion'

import { getChangedPackages } from '../lerna'

export default class BuildCommand extends Command {
  static strict = false

  static paths = [['build']]

  changes = Option.Boolean(`c`, false)

  args = Option.Rest()

  async execute() {
    if (this.changes) {
      const packages = await getChangedPackages(this.args)
      const scopes = packages.map(({ name }) => `--scope=${name}`)

      if (scopes.length > 0) {
        await execa('yarn', ['lerna', ...scopes, 'run', 'build'], {
          stdio: 'inherit',
        })
      }
    } else {
      await execa('yarn', ['lerna', 'run', 'build'], {
        stdio: 'inherit',
      })
    }
  }
}
