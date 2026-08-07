export type GeneratedProjectChange =
  | {
      artifact: string
      bytes: number
      kind: 'created' | 'updated'
    }
  | {
      artifact: string
      destination: string
      kind: 'renamed'
    }
  | {
      artifact: string
      kind: 'deleted'
    }

export interface GeneratedProjectResult {
  changes: Array<GeneratedProjectChange>
  status: 'generated'
}

export interface ProjectGenerationFailure {
  code: 'project-scaffolding-failed'
  message: string
}

export interface FailedProjectGenerationResult {
  changes: []
  failure: ProjectGenerationFailure
  status: 'failed'
}

export interface RejectedProjectGenerationResult {
  failure: {
    code: 'unsupported-project-scaffold-type'
    message: string
  }
  status: 'rejected'
}

export type ProjectScaffoldingResult = FailedProjectGenerationResult | GeneratedProjectResult

export type GenerateProjectResult = ProjectScaffoldingResult | RejectedProjectGenerationResult
