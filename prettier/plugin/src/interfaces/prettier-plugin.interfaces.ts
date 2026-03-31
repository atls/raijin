import type { Printer } from 'prettier'
import type { Parser }  from 'prettier'

export type PrintersType = Record<string, Printer>
export type ParsersType = Record<string, Parser>

export type GetPrettierPluginReturn = Promise<{
  printers: PrintersType
  parsers: ParsersType
}>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GetPrintersReturn = Promise<Record<string, any>>
