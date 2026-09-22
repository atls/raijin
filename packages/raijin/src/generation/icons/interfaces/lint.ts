export interface Linter {
  lint: (files: ReadonlyArray<string>) => Promise<number>
}
