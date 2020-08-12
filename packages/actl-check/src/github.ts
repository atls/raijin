import { context, GitHub } from '@actions/github'

const octokit = new GitHub(process.env.GITHUB_TOKEN);
const event = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH) : {};

export const createCheck = async (
  name: string,
  conclusion: string,
  output: any,
): Promise<void> => {
  const params = Object.assign(
    Object.assign(
      {},
      context.repo
    ),
    {
      name,
      head_sha: event.after || event.pull_request.head.sha || process.env.GITHUB_SHA,
      status: 'completed',
      completed_at: new Date().toISOString(),
      conclusion,
      output,
    }
  );

  try {
    await octokit.checks.create(params);
  }
  catch (error) {
    console.log(error); // eslint-disable-line
  }
}

export const getPullCommitsMessages = async (): Promise<any> => {
  const { data } = await octokit.pulls.listCommits(
    Object.assign(
      Object.assign(
        {}, context.repo,
      ),
      {
        pull_number: event.number,
      },
    ),
  );
  return data.map(({ commit }) => commit.message);
}
