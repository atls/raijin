import type { hasTypeScriptProject } from '@atls/raijin/config/typescript'

export interface TypeScriptConfigRuntime {
  hasTypeScriptProject: typeof hasTypeScriptProject
}
