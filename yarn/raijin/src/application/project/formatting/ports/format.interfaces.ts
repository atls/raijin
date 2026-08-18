import type { SourceTarget } from './files.interfaces.js'

export interface SourceFormatter {
  readonly format: (target: SourceTarget, source: string) => Promise<string>
}
