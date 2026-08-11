export interface GeneratedIconLinter {
  lint: (files: ReadonlyArray<string>) => Promise<number>
}
