export const COMMIT_SCOPE_ENUM = {
  back: { description: 'Changes that affect backend code' },
  front: { description: 'Changes that affect frontend code' },
  devops: { description: 'Changes that affect devops code' },
  custom: { description: 'Enter manually custom scope' },
}

export const COMMIT_TYPE_ENUM = {
  feat: {
    description: 'A new feature',
  },
  fix: {
    description: 'Bug Fixes',
  },
  docs: {
    description: 'Documentation only changes',
  },
  style: {
    description:
      'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
  },
  refactor: {
    description: 'A code change that neither fixes a bug nor adds a feature',
  },
  perf: { description: 'A code change that improves performance' },
  test: { description: 'Adding missing tests or correcting existing tests' },
  deps: { description: 'Changes that affect external dependencies' },
  build: { description: 'Changes that affect the build system' },
  ci: {
    description:
      'Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)',
  },
  chore: { description: "Other changes that don't modify src or test files" },
  revert: { description: 'Reverts a previous commit' },
}
