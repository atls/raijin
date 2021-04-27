export const isGithubActionsEnv = () => process.env.GITHUB_EVENT_PATH && process.env.GITHUB_TOKEN
