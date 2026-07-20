import type { materializeTypeScriptConfig } from '@atls/raijin/config/typescript'
import type { typescriptDefaults }          from '@atls/raijin/config/typescript'

export interface TypeScriptConfigRuntime {
  materializeTypeScriptConfig: typeof materializeTypeScriptConfig
  typescriptDefaults: typeof typescriptDefaults
}
