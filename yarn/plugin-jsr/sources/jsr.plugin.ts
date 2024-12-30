import type { Plugin }       from '@yarnpkg/core'

import { JsrPublishCommand } from './jsr-publish.command.js'

export const plugin: Plugin = {
  commands: [JsrPublishCommand],
}
