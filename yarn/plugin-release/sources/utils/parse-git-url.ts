import assert from 'node:assert/strict'

type ParseGitHubUrl = (repositoryUrl: string) => { organization: string; repository: string }

export const parseGitHubUrl: ParseGitHubUrl = (repositoryUrl) => {
  console.debug('Repository URL:', repositoryUrl)
  const match = repositoryUrl.match(/github\.com[/:](.+?)\/(.+?)(?:\.git|$)/)

  assert.ok(match, 'URL does not match pattern')

  const [, organization, repository] = match

  return { organization, repository }
}
