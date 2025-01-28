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
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { owner, repo, tag_name, name, make_latest, draft, body } = options

    const result = await this.client.repos.createRelease({
      owner,
      repo,
      tag_name,
      draft,
      make_latest: make_latest ? 'true' : 'false',
      name,
      body,
    })

    return result.status
  }
}
