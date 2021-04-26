import { Command }     from 'clipanion'

import { Conclusion }  from '../../types'
import { createCheck } from '../../github'

export default class ReleaseCommand extends Command {
  static description: string = 'Check release build'

  static paths = [['check:release']]

  async execute(): Promise<void> {
    try {
      this.cli.run(['release:build'])
      await this.check()
    } catch (error) {
      await this.check(error)
    }
  }

  async check(error?: any): Promise<void> {
    await createCheck('Release', error ? Conclusion.Failure : Conclusion.Success, {
      title: error ? 'Error build release' : 'Successful',
      summary: error ? error.message : '',
      annotations: [],
    })
  }
}
