import loadConfig from '@commitlint/load'

export const config = {
  extends: [
    require.resolve('@commitlint/config-conventional'),
    require.resolve('./header-max-length.config'),
    require.resolve('./scope-enum.config'),
  ],
}

export const load = () => loadConfig(config)
