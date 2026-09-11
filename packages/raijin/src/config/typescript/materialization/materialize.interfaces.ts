import type { TypeScriptConfigShape } from '../config.interfaces.js'

export interface MaterializeTypeScriptConfigOptions {
  readonly config: TypeScriptConfigShape
  readonly prefix: string
}
