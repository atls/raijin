export interface MergeOptions {
  readonly existingContent: string
  readonly templateContent: string
}

export interface CapturedState {
  content?: string
}
