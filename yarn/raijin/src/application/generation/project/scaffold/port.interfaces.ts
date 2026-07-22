import type { ScaffoldInput }  from './input.interfaces.js'
import type { ScaffoldResult } from './result.interfaces.js'

export interface Scaffolder {
  readonly generate: (input: ScaffoldInput) => Promise<ScaffoldResult>
}
