import { context }     from '@actions/github'

import { getOctokit }  from './octokit'

import { CheckStatus } from './checks.interfaces'
import { Conclusion }  from './checks.interfaces'

export const createCheck = async (name: string, conclusion: Conclusion, output) => {
  const octokit = getOctokit()

  const { payload } = context

  const params = {
    ...context.repo,
    name,
    head_sha: payload.after || payload.pull_request?.head.sha || (process.env.GITHUB_SHA as any),
    completed_at: new Date().toISOString(),
    status: 'completed' as CheckStatus,
    conclusion,
    output,
  }

  try {
    await octokit.checks.create(params)
  } catch (error) {
    // eslint-disable-next-line
    console.log(error)
  }
}
