import { Octokit }          from '@octokit/rest'
import { createActionAuth } from '@octokit/auth-action'

interface ReleaseOptions {
  token: string
}

interface CreateOptions {
  tag_name: string
  target_commitish?: string
  body?: string
  draft: boolean
  make_latest: boolean
  name: string
  owner: string
  repo: string
}

interface GenerateNotesOptions {
  tag_name: string
  target_commitish?: string
  previous_tag_name?: string
  owner: string
  repo: string
}

export class Release {
  private readonly client: Octokit

  constructor(options: ReleaseOptions) {
    this.client = new Octokit({
      auth: options.token,
      authStrategy: createActionAuth,
    })
  }

  async create(options: CreateOptions): Promise<number> {
    const {
      owner,
      repo,
      tag_name: tagName,
      target_commitish: targetCommitish,
      name,
      make_latest: makeLatest,
      draft,
      body,
    } = options

    const result = await this.client.repos.createRelease({
      owner,
      repo,
      tag_name: tagName,
      target_commitish: targetCommitish,
      draft,
      make_latest: makeLatest ? 'true' : 'false',
      name,
      body,
    })

    return result.status
  }

  async generateNotes(options: GenerateNotesOptions): Promise<string> {
    const {
      owner,
      repo,
      tag_name: tagName,
      target_commitish: targetCommitish,
      previous_tag_name: previousTagName,
    } = options

    const result = await this.client.repos.generateReleaseNotes({
      owner,
      repo,
      tag_name: tagName,
      target_commitish: targetCommitish,
      previous_tag_name: previousTagName,
    })

    return result.data.body
  }
}
