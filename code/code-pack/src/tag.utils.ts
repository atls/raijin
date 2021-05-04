import { execUtils }            from '@yarnpkg/core'
import { PortablePath }         from '@yarnpkg/fslib'

import { isGithubActionsEnv }   from '@atls/github-actions-utils'
import { getPullRequestSha }    from '@atls/github-actions-utils'
import { getPullRequestNumber } from '@atls/github-actions-utils'

import { TagPolicy }            from './pack.interfaces'

export const getRevision = async () => {
  if (isGithubActionsEnv()) {
    return getPullRequestSha()
  }

  const { stdout } = await execUtils.execvp('git', ['log', '-1', '--format="%H"'], {
    cwd: process.cwd() as PortablePath,
    strict: true,
  })

  const [revision] = stdout.split('\n')

  return revision.replace(/"/g, '')
}

export const getContext = async () => {
  if (isGithubActionsEnv()) {
    return getPullRequestNumber()
  }

  return 'local'
}

export const getTag = async (tagPolicy: TagPolicy) => {
  const revision = await getRevision()
  const hash = revision.substr(0, 7)

  if (tagPolicy === 'hash-timestamp') {
    return `${hash}-${Date.now()}`
  }

  if (tagPolicy === 'ctx-hash-timestamp') {
    const ctx = await getContext()

    return `${ctx}-${hash}-${Date.now()}`
  }

  return revision
}
