const config = {
  extends: ['@commitlint/config-lerna-scopes', '@commitlint/config-conventional'],
  rules: {
    'scope-enum': [0, 'always', ['deps', 'common', 'front', 'back', 'devops']],
    'header-max-length': [0, 'always', 140],
  },
};

export default config

