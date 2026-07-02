import type { Plugin }         from '@yarnpkg/core'

import { ServiceBuildCommand } from './service-build.command.jsx'
import { ServiceDevCommand }   from './service-dev.command.jsx'
import { ServiceStartCommand } from './service-start.command.js'

export const plugin: Plugin = {
  commands: [ServiceBuildCommand, ServiceDevCommand, ServiceStartCommand],
}
