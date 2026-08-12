export interface Formatter {
  format: (files: ReadonlyArray<string>) => Promise<number>
}
