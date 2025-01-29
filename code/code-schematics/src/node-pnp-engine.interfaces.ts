import type { RuleFactory } from '@angular-devkit/schematics/'

export type ResolveReferenceStringReturn = {
  ref: RuleFactory<object>
  path: string
} | null
