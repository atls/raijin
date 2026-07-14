import type { Printer } from 'prettier'
import type { Parser }  from 'prettier'

export type PrintersType = Record<string, Printer>
export type ParsersType = Record<string, Parser>

export interface CreatePluginOptions {
  workspacePackageNames?: ReadonlyArray<string>
}

export type CreatePluginResult = Promise<{
  printers: PrintersType
  parsers: ParsersType
}>

export type GetPrettierPluginOptions = CreatePluginOptions
export type GetPrettierPluginReturn = CreatePluginResult
