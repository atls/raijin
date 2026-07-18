import type { Config }                     from '@atls/raijin/svgr'
import type { jsx as svgrJsx }             from '@atls/raijin/svgr'
import type { transform as svgrTransform } from '@atls/raijin/svgr'
import type { webpack }                    from '@atls/raijin/webpack'

export type AttributeReplacements = NonNullable<Config['replaceAttrValues']>
export type IconReplacements = Record<string, AttributeReplacements>

export interface SvgrRuntime {
  transform: typeof svgrTransform
  jsx: typeof svgrJsx
}

export interface WebpackRuntime {
  webpack: typeof webpack
  tsLoaderPath: string
}

export interface Source {
  source: string
  path: string
  name: string
  component: string
}

export interface Output extends Source {
  output: string
}

export interface CompiledConfiguration {
  replacements: IconReplacements
  template: Config['template']
}
