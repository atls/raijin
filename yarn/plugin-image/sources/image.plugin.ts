import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { ImagePackCommand }         from './image-pack.command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({ workspace: [ImagePackCommand] }),
}
