import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { ServiceLogRecord }        from '../logging/interfaces.js'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

import { writeLogRecord }               from '../logging/write.jsx'

export abstract class AbstractServiceCommand extends BaseCommand {
  declare context: WorkspaceCommandContext

  showWarnings = Option.Boolean('-w,--show-warnings', false)

  renderLogRecord(logRecord: ServiceLogRecord): void {
    writeLogRecord(this.context, logRecord, this.showWarnings)
  }
}
