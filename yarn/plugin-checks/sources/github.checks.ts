import type { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'
import type { RequestParameters }                     from '@octokit/types'

import { getOctokit }                                 from '@actions/github'
import { context }                                    from '@actions/github'

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
  private octokit: ReturnType<typeof getOctokit>

  constructor(private readonly name: string) {
    if (process.env.GITHUB_TOKEN == null) {
      throw new Error('GITHUB_TOKEN is not defined')
    }

    this.octokit = getOctokit(process.env.GITHUB_TOKEN)
  }

  async create(
    params: RequestParameters & {
      owner: string
      repo: string
      name: string
      head_sha: string
    }
  ): Promise<GetResponseDataTypeFromEndpointMethod<typeof this.octokit.rest.checks.create>> {
    const response = await this.octokit.rest.checks.create(params)

    return response.data
  }

  async start(): Promise<
    GetResponseDataTypeFromEndpointMethod<typeof this.octokit.rest.checks.create>
  > {
    const { payload } = context

    return this.create({
      ...context.repo,
      name: this.name,
      head_sha: payload.after || payload.pull_request?.head.sha || process.env.GITHUB_SHA!,
      started_at: new Date().toISOString(),
      status: 'in_progress',
    })
  }

  async complete(
    id: number,
    output: { title: string; summary: string; annotations: Array<Annotation> }
  ): Promise<GetResponseDataTypeFromEndpointMethod<typeof this.octokit.rest.checks.create>> {
    const { payload } = context

    return this.create({
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

  async failure(output: {
    title: string
    summary: string
    annotations?: Array<Annotation>
  }): Promise<GetResponseDataTypeFromEndpointMethod<typeof this.octokit.rest.checks.create>> {
    const { payload } = context

    return this.create({
      ...context.repo,
      name: this.name,
      head_sha: payload.after || payload.pull_request?.head.sha || process.env.GITHUB_SHA!,
      completed_at: new Date().toISOString(),
      status: 'completed',
      conclusion: 'failure',
      output:
        output.annotations && output.annotations.length > 50
          ? {
              ...output,
              annotations: output.annotations.slice(0, 50),
            }
          : output,
    })
  }
}
