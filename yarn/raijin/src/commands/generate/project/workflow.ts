/* eslint-disable no-console */

import type { CommandInput }             from '@atls/raijin/commands/input'
import type { PortablePath }             from '@yarnpkg/fslib'

import type { Options }                  from './workflow.interfaces.js'

import { UnsuccessfulWorkflowExecution } from '@angular-devkit/schematics'
import { NodeWorkflow }                  from '@angular-devkit/schematics/tools'
import { npath }                         from '@yarnpkg/fslib'
import { lastValueFrom }                 from 'rxjs'

import { reportProjectGenerationEvent }  from './reporter.js'

export const resolveProjectTarget = (input: CommandInput): PortablePath => {
  const target = input.targets.at(0)

  if (!target || input.targets.length !== 1) {
    throw new Error('Project generation requires exactly one target')
  }

  return target.path
}

export const generateProject = async ({
  collection,
  input,
  project,
  type,
}: Options): Promise<0 | 1> => {
  const target = resolveProjectTarget(input)
  const workflow = new NodeWorkflow(npath.fromPortablePath(target), {
    force: false,
    dryRun: false,
    resolvePaths: [npath.fromPortablePath(project.cwd)],
    packageManager: 'yarn',
  })

  workflow.reporter.subscribe(reportProjectGenerationEvent)

  try {
    await lastValueFrom(
      workflow.execute({
        collection: npath.fromPortablePath(collection),
        schematic: 'project',
        options: {
          type,
          cwd: npath.fromPortablePath(target),
        },
        allowPrivate: true,
        debug: true,
      })
    )

    return 0
  } catch (error) {
    if (error instanceof UnsuccessfulWorkflowExecution) {
      console.debug('The project generation workflow failed. See above.')
    } else if (error instanceof Error) {
      console.debug(`Project generation failed:\n${error.stack}`)
    } else {
      console.debug(`Project generation failed: ${String(error)}`)
    }

    return 1
  }
}
