import { Plugin }              from '@yarnpkg/core'

import { ServiceBuildCommand } from './service-build.command'
import { ServiceDevCommand }   from './service-dev.command'

export const plugin: Plugin = {
  commands: [ServiceBuildCommand, ServiceDevCommand],
}
