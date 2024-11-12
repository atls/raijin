import type { Plugin }         from '@yarnpkg/core'

import { ServiceBuildCommand } from './service-build.command.jsx'
import { ServiceDevCommand }   from './service-dev.command.jsx'

export const plugin: Plugin = {
  commands: [ServiceBuildCommand, ServiceDevCommand],
}
