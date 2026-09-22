import type { Config }    from '@svgr/core'
import type { Plugin }    from '@svgr/core'
import type { transform } from '@svgr/core'

export type ModuleImporter = (specifier: string) => Promise<unknown>

export interface TransformOptions {
  importModule?: ModuleImporter
  jsx?: Plugin
  transform?: typeof transform
}

export interface IconConfiguration {
  replacements: Record<string, Record<string, string>>
  template: NonNullable<Config['template']>
}
