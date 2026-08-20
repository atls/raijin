export interface FormattedSource {
  readonly file: string
  readonly status: 'changed' | 'unchanged'
}

export interface FormatSourcesResult {
  readonly files: ReadonlyArray<FormattedSource>
}

export type FormatCommandResult =
  | { readonly error: unknown; readonly status: 'failed' }
  | { readonly result: FormatSourcesResult; readonly status: 'succeeded' }
