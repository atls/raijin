import { Command, flags } from '@oclif/command';
import * as execa from 'execa'

import { getChangedPackages } from '../lerna'


export default class BuildCommand extends Command {
  static description = 'Build release'
  static examples = ['$ actl release:build']
  static strict = false

  static flags = {
    changes: flags.boolean({
      char: 'c',
      description: 'Build only changes',
      default: false,
    }),
  }

  async run() {
    const { argv, flags: { changes }, } = this.parse(BuildCommand)

    if (changes) {
      const packages = await getChangedPackages(argv)
      const scopes = packages.map(({ name }) => `--scope=${name}`)

      if (scopes.length > 0) {
        await execa('yarn', ['lerna', ...scopes, 'run', 'build'], {
          stdio: 'inherit',
        });
      }
    }
    else {
      await execa('yarn', ['lerna', 'run', 'build'], {
        stdio: 'inherit',
      });
    }
  }
}
