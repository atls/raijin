import { Command }       from 'clipanion'

import { RaijinCommand } from '@atls/raijin/commands'

export abstract class AbstractRaijinSyncCommand extends RaijinCommand {
  static override usage = Command.Usage({
    description: 'Update Raijin project support files',
    details: `
    Update Raijin project support files such as \`tsconfig\` and \`typescript\` version
    `,
    examples: [
      ['Update tsconfig', 'yarn raijin sync tsconfig'],
      ['Update runtime', 'yarn install'],
      ['Update typescript version', 'yarn raijin sync typescript'],
      [`Update all`, 'yarn raijin sync'],
    ],
  })
}
