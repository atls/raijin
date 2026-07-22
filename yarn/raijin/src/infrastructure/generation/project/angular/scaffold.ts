import type { DryRunEvent }                 from '@angular-devkit/schematics'
import type { GenerateProjectInput }        from '@atls/raijin/application/generation'
import type { ProjectGenerationChange }     from '@atls/raijin/application/generation'
import type { ProjectGenerationDiagnostic } from '@atls/raijin/application/generation'
import type { ProjectGenerationResult }     from '@atls/raijin/application/generation'

import { dirname }                          from 'node:path'

import { NodeWorkflow }                     from '@angular-devkit/schematics/tools'
import { logging }                          from '@angular-devkit/core'
import { lastValueFrom }                    from 'rxjs'

const toProjectGenerationChange = (event: DryRunEvent): ProjectGenerationChange | undefined => {
  switch (event.kind) {
    case 'create':
      return {
        kind: 'created',
        path: event.path,
        size: event.content.length,
      }
    case 'update':
      return {
        kind: 'updated',
        path: event.path,
        size: event.content.length,
      }
    case 'delete':
      return {
        kind: 'deleted',
        path: event.path,
      }
    case 'rename':
      return {
        kind: 'renamed',
        path: event.path,
        destination: event.to,
      }
    case 'error':
      return undefined
    default:
      return undefined
  }
}

const toWorkflowDiagnostic = (event: DryRunEvent): ProjectGenerationDiagnostic | undefined => {
  if (event.kind !== 'error') {
    return undefined
  }

  return {
    level: 'error',
    message: `${event.path} ${event.description === 'alreadyExist' ? 'already exists' : 'does not exist'}.`,
  }
}

const toDiagnosticLevel = (
  level: logging.LogEntry['level']
): ProjectGenerationDiagnostic['level'] => {
  switch (level) {
    case 'fatal':
      return 'error'
    case 'warn':
      return 'warning'
    default:
      return level
  }
}

const toLoggerDiagnostic = ({ level, message }: logging.LogEntry): ProjectGenerationDiagnostic => ({
  level: toDiagnosticLevel(level),
  message,
})

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export const scaffoldProjectWithAngular = async (
  collectionPath: string,
  input: GenerateProjectInput
): Promise<ProjectGenerationResult> => {
  const changes: Array<ProjectGenerationChange> = []
  const diagnostics: Array<ProjectGenerationDiagnostic> = []
  const logger = new logging.Logger('raijin-project-generation')
  const workflow = new NodeWorkflow(input.targetPath, {
    dryRun: false,
    force: false,
    packageManager: 'yarn',
    resolvePaths: [dirname(collectionPath)],
    schemaValidation: true,
  })
  const reporterSubscription = workflow.reporter.subscribe((event) => {
    const change = toProjectGenerationChange(event)
    const diagnostic = toWorkflowDiagnostic(event)

    if (change) {
      changes.push(change)
    }

    if (diagnostic) {
      diagnostics.push(diagnostic)
    }
  })
  const loggerSubscription = logger.subscribe((entry) => {
    diagnostics.push(toLoggerDiagnostic(entry))
  })

  try {
    await lastValueFrom(
      workflow.execute({
        collection: collectionPath,
        schematic: 'project',
        options: {
          type: input.scaffoldType,
        },
        logger,
      }),
      { defaultValue: undefined }
    )

    return {
      status: 'succeeded',
      changes,
      diagnostics,
    }
  } catch (error) {
    return {
      status: 'failed',
      changes,
      diagnostics,
      failure: {
        code: 'project-scaffold-failed',
        message: `Project scaffold failed: ${getErrorMessage(error)}`,
      },
    }
  } finally {
    reporterSubscription.unsubscribe()
    loggerSubscription.unsubscribe()
    logger.complete()
  }
}
