/* eslint-disable */

import { BaseCommand }             from '@yarnpkg/cli'
import { Configuration }           from '@yarnpkg/core'
import { Project }                 from '@yarnpkg/core'
import { StreamReport }            from '@yarnpkg/core'
import { Option }                  from 'clipanion'

import { getStreamReportCallback } from '../getters/index.js'
import { getStreamReportOptions }  from '../getters/index.js'
import { getCollectionPath }       from '../getters/index.js'

export class GenerateProjectCommand extends BaseCommand {
  static override paths = [['generate']]

  type = Option.String('-t,--type', 'project')

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const collectionPath = await getCollectionPath()

    const allowedTypes = ['libraries', 'project']

    if (!allowedTypes.includes(this.type)) {
      throw new Error(`Allowed only ${allowedTypes.join(', ')} types`)
    }

    const options = {
      type: this.type,
      cwd: process.cwd(),
      collectionPath,
    }

    const streamReportOptions = getStreamReportOptions(this, configuration)
    const streamReportCallback = getStreamReportCallback(options)

    const commandReport = await StreamReport.start(streamReportOptions, streamReportCallback)

    return commandReport.exitCode()
  }
}
