import type { Config }              from 'prettier'

import type { CreatePluginOptions } from '../../../runtime/prettier/plugin/create.interfaces.js'

export interface ResolvePrettierProjectOptions {
  readonly filepath: string
  readonly plugin?: CreatePluginOptions
}

export type PrettierProjectConfig = Config
