import { Command }     from '@oclif/command'

import { Conclusion }  from '../../types'
import { createCheck } from '../../github'

export default class ReleaseCommand extends Command {
  static description: string = 'Check release build'

  static examples: string[] = ['$ mctl check:release']

  async run(): Promise<void> {
    try {
      const plugin = this.config.findCommand('release:build')

      if (!plugin) {
        throw new Error('mctl release:build command dependency not found')
      }

      const command = plugin.load()

      await command.run([])
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
