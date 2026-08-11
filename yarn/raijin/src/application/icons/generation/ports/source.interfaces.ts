export interface IconSource {
  content: string
  name: string
}

export interface IconSourceReader {
  read: (cwd: string) => Promise<Array<IconSource>>
}
