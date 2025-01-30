import { Octokit }          from '@octokit/rest'
import { createActionAuth } from '@octokit/auth-action'

interface ReleaseOptions {
  token: string
}

interface CreateOptions {
  tag_name: string
  draft: boolean
  make_latest: boolean
  name: string
  body: string
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
    const { owner, repo, tag_name: tagName, name, make_latest: makeLatest, draft, body } = options

    const result = await this.client.repos.createRelease({
      owner,
      repo,
      tag_name: tagName,
      draft,
      make_latest: makeLatest ? 'true' : 'false',
      name,
      body,
    })

    return result.status
  }
}
