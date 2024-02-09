import type { Config } from 'jest'

import { tsConfig }    from '@atls/config-typescript'

export const unit: Config = {
  transformIgnorePatterns: ['/node_modules/', '\\.pnp\\.[^\\/]+$'],
  modulePathIgnorePatterns: ['dist', 'integration'],
  testRegex: '\\.test\\.(ts|tsx)$',
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid|ttf|woff|woff2|eot|otf)$':
      '@atls/jest-static-stubs/$1',
  },
  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': [
      require.resolve('ts-jest'),
      {
        tsconfig: tsConfig.compilerOptions,
        isolatedModules: true,
        diagnostics: false,
      },
    ],
  },
  resolver: require.resolve('@monstrs/jest-pnp-resolver'),
}

export const integration: Config = {
  testRegex: '/integration/.*\\.test\\.(ts|tsx)$',
  modulePathIgnorePatterns: ['dist'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid|ttf|woff|woff2|eot|otf)$':
      '@atls/jest-static-stubs/$1',
  },
  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': [
      require.resolve('ts-jest'),
      {
        tsconfig: tsConfig.compilerOptions,
        isolatedModules: true,
        diagnostics: false,
      },
    ],
  },
  resolver: require.resolve('@monstrs/jest-pnp-resolver'),
}
