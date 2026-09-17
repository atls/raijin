import { createRequire } from 'node:module'

const conventionalCommitsConfigPath = createRequire(import.meta.url).resolve(
  'conventional-changelog-conventionalcommits'
)

export default {
  branches: ['master'],
  tagFormat: '@atls/raijin@${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { config: conventionalCommitsConfigPath }],
    ['@semantic-release/release-notes-generator', { config: conventionalCommitsConfigPath }],
    ['@semantic-release/exec', {
      prepareCmd: 'yarn workspace @atls/raijin version ${nextRelease.version} --immediate && yarn cli:build',
      publishCmd: 'YARN_NPM_AUTH_TOKEN="$NPM_TOKEN" YARN_NPM_REGISTRY_SERVER=https://registry.npmjs.org YARN_NPM_PUBLISH_REGISTRY=https://registry.npmjs.org yarn workspace @atls/raijin npm publish --access public --tag candidate && YARN_NPM_AUTH_TOKEN="$GITHUB_PACKAGES_TOKEN" YARN_NPM_REGISTRY_SERVER=https://npm.pkg.github.com YARN_NPM_PUBLISH_REGISTRY=https://npm.pkg.github.com yarn workspace @atls/raijin npm publish --access public',
      successCmd: 'YARN_NPM_AUTH_TOKEN="$NPM_TOKEN" YARN_NPM_REGISTRY_SERVER=https://registry.npmjs.org yarn npm tag add @atls/raijin@${nextRelease.version} latest',
    }],
    ['@semantic-release/github', {
      successComment: false,
      failComment: false,
      releasedLabels: false,
      assets: [
        { path: '.yarn/releases/yarn.js', name: 'yarn.js' },
      ],
    }],
  ],
}
