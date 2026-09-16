export const shouldSkipRepositoryHooks = () =>
  process.env.CI === 'true' ||
  process.env.GITHUB_ACTIONS === 'true' ||
  Boolean(process.env.IMAGE_PACK) ||
  process.env.HUSKY === '0'
