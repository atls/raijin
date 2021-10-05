import { base } from '@atls/code-typescript'
import { join } from 'path'

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
      isolatedModules: true,
      diagnostics: false,
    },
  },
  transform: {
    '^.+\\.[tj]sx?$': require.resolve('ts-jest'),
  },
  resolver: join(__dirname, '../resolver.js'),
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
      isolatedModules: true,
      diagnostics: false,
    },
  },
  transform: {
    '^.+\\.[tj]sx?$': require.resolve('ts-jest'),
  },
  resolver: join(__dirname, '../resolver.js'),
}
