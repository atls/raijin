import { createRequire } from 'node:module'

import tsconfig          from '@atls/config-typescript'

const require = createRequire(import.meta.url)

export const unit = {
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  transformIgnorePatterns: ['/node_modules/', '\\.pnp\\.[^\\/]+$'],
  testRegex: '\\.test\\.(ts|tsx|js|jsx)$',
  modulePathIgnorePatterns: ['dist', 'integration'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid)$': 'jest-static-stubs/$1',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      require.resolve('ts-jest'),
      {
        tsconfig: tsconfig.compilerOptions,
        isolatedModules: true,
        diagnostics: false,
        useESM: true,
      },
    ],
  },
  resolver: require.resolve('@atls/jest-resolver'),
}

export const integration = {
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  testRegex: '/integration/.*\\.test\\.(ts|tsx)$',
  modulePathIgnorePatterns: ['dist'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid)$': 'jest-static-stubs/$1',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      require.resolve('ts-jest'),
      {
        tsconfig: tsconfig.compilerOptions,
        isolatedModules: true,
        diagnostics: false,
        useESM: true,
      },
    ],
  },
  resolver: require.resolve('@atls/jest-resolver'),
}
