/* eslint-disable */

import { mkdir }                   from 'node:fs/promises'
import { rm }                      from 'node:fs/promises'
import { join }                    from 'node:path'

import { BaseCommand }             from '@yarnpkg/cli'
import { Configuration }           from '@yarnpkg/core'
import { StreamReport }            from '@yarnpkg/core'
import { Option }                  from 'clipanion'

import { getStreamReportCallback } from '@atls/code-schematics'
import { getStreamReportOptions }  from '@atls/code-schematics'
import { writeSchematicFactory }   from '@atls/code-schematics'

export class GenerateProjectCommand extends BaseCommand {
  static override paths = [['generate', 'project']]

  type = Option.String('-t,--type', 'project')

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { writeFiles } = await import('@atls/code-runtime')

    const TMP_PATH = './tmp'

    await rm(TMP_PATH, { recursive: true, force: true })
    await mkdir(TMP_PATH)
    await writeFiles(TMP_PATH)
    console.log('after write schematic files')
    await mkdir(join(TMP_PATH, 'project'), { recursive: true })
    await writeSchematicFactory('./tmp/project/project.factory.cjs')
    console.log('after write schematic factory files')

    // const collectionPath = join(TMP_PATH, "collection.json");
    const collectionPath = './tmp/collection.json'
    // console.log(collectionPath);

    const allowedTypes = ['libraries', 'project']

    if (!allowedTypes.includes(this.type)) {
      throw new Error(`Allowed only ${allowedTypes.join(', ')} types`)
    }

    const options = {
      type: this.type,
      cwd: process.cwd(),
      collectionPath,
    }

    console.log('before callback')
    const streamReportOptions = getStreamReportOptions(this, configuration)
    const streamReportCallback = await getStreamReportCallback(options)

    const commandReport = await StreamReport.start(streamReportOptions, streamReportCallback)

    return commandReport.exitCode()
  }
}
