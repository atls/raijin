import type { DryRunEvent }              from '@angular-devkit/schematics'

import type { ProjectScaffoldType }      from '../../../../application/generation/project/index.js'
import type { ProjectScaffoldingResult } from '../../../../application/generation/project/index.js'
import type { GeneratedProjectChange }   from '../../../../application/generation/project/index.js'
import type { GeneratedWorkflowPolicy }  from '../github/generated-workflow-policy.js'

import { NodeWorkflow }                  from '@angular-devkit/schematics/tools/index.js'
import { lastValueFrom }                 from 'rxjs'

import typescriptDefaults                from '../../../../config/typescript/defaults.js'

const toProjectChange = (event: DryRunEvent): GeneratedProjectChange | undefined => {
  if (event.kind === 'create' || event.kind === 'update') {
    return {
      artifact: event.path,
      bytes: event.content.length,
      kind: event.kind === 'create' ? 'created' : 'updated',
    }
  }

  if (event.kind === 'delete') {
    return { artifact: event.path, kind: 'deleted' }
  }

  if (event.kind === 'rename') {
    return { artifact: event.path, destination: event.to, kind: 'renamed' }
  }

  return undefined
}

const failureMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

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
  const changes: Array<GeneratedProjectChange> = []
  const workflow = new NodeWorkflow(targetPath, {
    dryRun: false,
    force: true,
    packageManager: 'yarn',
    resolvePaths: [targetPath],
    schemaValidation: true,
  })
  const subscription = workflow.reporter.subscribe((event) => {
    const change = toProjectChange(event)

    if (change) {
      changes.push(change)
    }
  })

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
  } finally {
    subscription.unsubscribe()
  }
}
