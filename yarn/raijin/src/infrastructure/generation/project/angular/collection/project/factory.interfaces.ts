import type { ScaffoldType }            from '@atls/raijin/application/generation'

import type { GeneratedWorkflowPolicy } from '../../../github/workflows/policy.interfaces.js'

export interface SchematicOptions {
  readonly type: ScaffoldType
}

export interface ProjectManifest {
  readonly name: string
}

export interface CommonTemplateVariables extends SchematicOptions {
  readonly workflowPolicy: GeneratedWorkflowPolicy
}

export interface ScaffoldTemplateVariables extends CommonTemplateVariables {
  readonly projectName: string
}
