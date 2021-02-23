import { GitHub, context } from '@actions/github'
import { join } from 'path'


const event = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : {}
const octokit = new GitHub(process.env.GITHUB_TOKEN)

export const getPullFiles = async (): Promise<any> => {
  const cwd = process.cwd();
  const { data } = await octokit.pulls.listFiles(
    Object.assign(
      Object.assign({}, context.repo),
      { pull_number: event.number },
    )
  );
  return data.map(({ filename }) => join(cwd, filename));
}
