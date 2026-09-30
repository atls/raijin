export interface CommitMessageInput {
  type: string
  subject: string
  scope?: string
  body?: string
  breaking?: string
  issues?: string
  skipci?: boolean
}
