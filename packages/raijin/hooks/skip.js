export const shouldSkipRepositoryHooks = () => {
  const ci = process.env.CI?.trim().toLowerCase()

  return (
    (ci !== undefined && ci !== '' && ci !== 'false' && ci !== '0') ||
    process.env.GITHUB_ACTIONS === 'true' ||
    Boolean(process.env.IMAGE_PACK) ||
    process.env.HUSKY === '0'
  )
}
