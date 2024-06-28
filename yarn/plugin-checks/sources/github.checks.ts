import { getOctokit } from '@actions/github'
import { context }    from '@actions/github'

// eslint-disable-next-line no-shadow
export enum AnnotationLevel {
  Warning = 'warning',
  Failure = 'failure',
}

export interface Annotation {
  path: string
  start_line: number
  end_line: number
  annotation_level: AnnotationLevel
  raw_details: string
  title: string
  message: string
}

export class GitHubChecks {
  private octokit

  constructor(private readonly name: string) {
    this.octokit = getOctokit(process.env.GITHUB_TOKEN!)
  }

  start() {
    const { payload } = context

    return this.octokit.rest.checks.create({
      ...context.repo,
      name: this.name,
      head_sha: payload.after || payload.pull_request?.head.sha || (process.env.GITHUB_SHA as any),
      started_at: new Date().toISOString(),
      status: 'in_progress',
    })
  }

  complete(id: number, output: any) {
    const { payload } = context

    return this.octokit.rest.checks.create({
      ...context.repo,
      check_run_id: id,
      name: this.name,
      head_sha: payload.after || payload.pull_request?.head.sha || (process.env.GITHUB_SHA as any),
      completed_at: new Date().toISOString(),
      status: 'completed',
      conclusion: output.annotations.length > 0 ? 'failure' : 'success',
      output:
        output.annotations?.length > 50
          ? {
              ...output,
              annotations: output.annotations.slice(0, 50),
            }
          : output,
    })
  }

  failure(output: any) {
    const { payload } = context

    return this.octokit.rest.checks.create({
      ...context.repo,
      name: this.name,
      head_sha: payload.after || payload.pull_request?.head.sha || (process.env.GITHUB_SHA as any),
      completed_at: new Date().toISOString(),
      status: 'completed',
      conclusion: 'failure',
      output:
        output.annotations?.length > 50
          ? {
              ...output,
              annotations: output.annotations.slice(0, 50),
            }
          : output,
    })
  }
}
