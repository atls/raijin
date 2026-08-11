export type CopyFile = (source: string, destination: string) => Promise<void>

export type RemoveFile = (path: string) => Promise<void>
