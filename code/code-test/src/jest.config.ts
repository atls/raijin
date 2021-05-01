import { base } from '@atls/code-typescript'

export const unitConfig = {
  testRegex: '\\.test\\.(ts|tsx)$',
  modulePathIgnorePatterns: ['dist', 'integration'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid)$': 'jest-static-stubs/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: base.compilerOptions,
      diagnostics: false,
    },
  },
  transform: {
    '^.+\\.[tj]sx?$': require.resolve('ts-jest'),
  },
}

export const integrationConfig = {
  testRegex: '/integration/.*\\.test\\.(ts|tsx)$',
  modulePathIgnorePatterns: ['dist'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid)$': 'jest-static-stubs/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: base.compilerOptions,
      diagnostics: false,
    },
  },
  transform: {
    '^.+\\.[tj]sx?$': require.resolve('ts-jest'),
  },
}
