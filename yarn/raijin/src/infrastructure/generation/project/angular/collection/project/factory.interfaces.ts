import type { ScaffoldType } from '@atls/raijin/application/generation'

export interface SchematicOptions {
  readonly type: ScaffoldType
}

export interface PackageManifest {
  readonly name: string
}
