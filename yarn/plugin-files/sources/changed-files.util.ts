import { Endpoints }  from '@octokit/types'
import { Project }    from '@yarnpkg/core'
import { context }    from '@actions/github'
import { getOctokit } from '@actions/github'
import { execUtils }  from '@yarnpkg/core'

type GetCommitResponseData = Endpoints['GET /repos/{owner}/{repo}/commits/{ref}']['response']

export const getEventCommmits = async () => {
  if (context.eventName === 'push') {
    return context.payload.commits
  }

  if (context.eventName === 'pull_request' && context.payload.pull_request) {
    const url = context.payload.pull_request.commits_url

    return getOctokit(process.env.GITHUB_TOKEN!).paginate(`GET ${url}`, context.repo)
  }

  // eslint-disable-next-line no-console
  console.log(`Unknown event "${context.eventName}". Only "push" and "pull_request" supported.`)

  return []
}

export const getCommitData = async (ref: string): Promise<GetCommitResponseData> => {
  const commit = await getOctokit(process.env.GITHUB_TOKEN!).rest.repos.getCommit({
    ...context.repo,
    ref,
  })

  return commit as GetCommitResponseData
}

export const getChangedCommmits = async (): Promise<Array<GetCommitResponseData>> => {
  const eventCommits = await getEventCommmits()

  return Promise.all(eventCommits.map((commit: any) => getCommitData(commit.id || commit.sha)))
}

export const getGithubChangedFiles = async (): Promise<Array<string>> => {
  const commits = await getChangedCommmits()

  return commits
    .map((commit) => {
      if (!commit?.data?.files) {
        return []
      }

      return commit.data.files.map((file) => file.filename).filter(Boolean) as Array<string>
    })
    .flat()
}

export const getChangedFiles = async (project: Project, gitRange?: string) => {
  if (process.env.GITHUB_EVENT_PATH && process.env.GITHUB_TOKEN) {
    return getGithubChangedFiles()
  }

  const { stdout } = await execUtils.execvp(
    'git',
    ['diff', '--name-only', ...(gitRange ? [gitRange] : [])],
    {
      cwd: project.cwd,
      strict: true,
    }
  )

  return stdout.split(/\r?\n/).filter(Boolean)
}
