import type { DryRunEvent }              from '@angular-devkit/schematics'

import type { ProjectScaffoldType }      from '../../../../application/generation/project/index.js'
import type { ProjectScaffoldingResult } from '../../../../application/generation/project/index.js'
import type { GeneratedProjectChange }   from '../../../../application/generation/project/index.js'
import type { GeneratedWorkflowPolicy }  from '../github/generated-workflow-policy.js'

import { readFile }                      from 'node:fs/promises'
import { join }                          from 'node:path'

import { NodeWorkflow }                  from '@angular-devkit/schematics/tools/index.js'
import { lastValueFrom }                 from 'rxjs'

import typescriptDefaults                from '../../../../config/typescript/defaults.js'

type FileSnapshot = Buffer | undefined

const projectEventPaths = (event: DryRunEvent): Array<string> => {
  if (event.kind === 'rename') {
    return [event.path, event.to]
  }

  if (event.kind === 'create' || event.kind === 'delete' || event.kind === 'update') {
    return [event.path]
  }

  return []
}

const readFileSnapshot = async (targetPath: string, artifact: string): Promise<FileSnapshot> => {
  try {
    return await readFile(join(targetPath, artifact))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

const captureProjectState = async (
  events: Array<DryRunEvent>,
  targetPath: string
): Promise<Map<string, FileSnapshot>> =>
  new Map(
    await Promise.all(
      [...new Set(events.flatMap(projectEventPaths))].map(
        async (artifact) => [artifact, await readFileSnapshot(targetPath, artifact)] as const
      )
    )
  )

const toProjectChange = async (
  event: DryRunEvent,
  previousState: Map<string, FileSnapshot>,
  targetPath: string
): Promise<GeneratedProjectChange | undefined> => {
  if (event.kind === 'create' || event.kind === 'update') {
    const current = await readFileSnapshot(targetPath, event.path)
    const previous = previousState.get(event.path)

    if (current === undefined || previous?.equals(current)) {
      return undefined
    }

    return {
      artifact: event.path,
      bytes: current.length,
      kind: previous === undefined ? 'created' : 'updated',
    }
  }

  if (event.kind === 'delete') {
    const current = await readFileSnapshot(targetPath, event.path)

    return previousState.get(event.path) !== undefined && current === undefined
      ? { artifact: event.path, kind: 'deleted' }
      : undefined
  }

  if (event.kind === 'rename') {
    const currentDestination = await readFileSnapshot(targetPath, event.to)
    const currentSource = await readFileSnapshot(targetPath, event.path)

    return previousState.get(event.path) !== undefined &&
      currentDestination !== undefined &&
      currentSource === undefined
      ? { artifact: event.path, destination: event.to, kind: 'renamed' }
      : undefined
  }

  return undefined
}

const failureMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const executeProjectWorkflow = async ({
  collectionPath,
  dryRun,
  onEvent,
  policy,
  scaffoldType,
  targetPath,
}: {
  collectionPath: string
  dryRun: boolean
  onEvent?: (event: DryRunEvent) => void
  policy: GeneratedWorkflowPolicy
  scaffoldType: ProjectScaffoldType
  targetPath: string
}): Promise<void> => {
  const workflow = new NodeWorkflow(targetPath, {
    dryRun,
    force: true,
    packageManager: 'yarn',
    resolvePaths: [targetPath],
    schemaValidation: true,
  })
  const subscription = onEvent ? workflow.reporter.subscribe(onEvent) : undefined

  try {
    await lastValueFrom(
      workflow.execute({
        allowPrivate: true,
        collection: collectionPath,
        debug: false,
        options: {
          ...policy,
          scaffoldType,
          typescriptCompilerOptions: typescriptDefaults.compilerOptions,
        },
        schematic: 'project',
      }),
      { defaultValue: undefined }
    )
  } finally {
    subscription?.unsubscribe()
  }
}

export const scaffoldProjectWithAngular = async ({
  collectionPath,
  policy,
  scaffoldType,
  targetPath,
}: {
  collectionPath: string
  policy: GeneratedWorkflowPolicy
  scaffoldType: ProjectScaffoldType
  targetPath: string
}): Promise<ProjectScaffoldingResult> => {
  const events: Array<DryRunEvent> = []

  try {
    await executeProjectWorkflow({
      collectionPath,
      dryRun: true,
      onEvent: (event) => events.push(event),
      policy,
      scaffoldType,
      targetPath,
    })
    const previousState = await captureProjectState(events, targetPath)

    if (events.length > 0) {
      await executeProjectWorkflow({
        collectionPath,
        dryRun: false,
        policy,
        scaffoldType,
        targetPath,
      })
    }

    const changes = (
      await Promise.all(
        events.map(async (event) => toProjectChange(event, previousState, targetPath))
      )
    ).filter((change): change is GeneratedProjectChange => change !== undefined)

    return { status: 'generated', changes }
  } catch (error) {
    return {
      status: 'failed',
      changes: [],
      failure: {
        code: 'project-scaffolding-failed',
        message: `Project scaffolding failed: ${failureMessage(error)}`,
      },
    }
  }
}
