import { getOctokit as createOctokit } from '@actions/github'

export const getOctokit = () => createOctokit(process.env.GITHUB_TOKEN!)
