import { createRequire } from 'node:module'

import tsconfig          from '@atls/config-typescript'

const require = createRequire(import.meta.url)

export const unit = {
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  transformIgnorePatterns: ['/node_modules/?!(camelcase)', '\\.pnp\\.[^\\/]+$'],
  testRegex: '\\.test\\.(ts|tsx|js|jsx)$',
  modulePathIgnorePatterns: ['dist', 'integration'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid)$': 'jest-static-stubs/$1',
  },
  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': [
      require.resolve('@swc/jest'),
      {
        minify: false,
        jsc: {
          parser: {
            syntax: 'typescript',
            jsx: true,
            dynamicImport: true,
            privateMethod: true,
            functionBind: true,
            exportDefaultFrom: true,
            exportNamespaceFrom: true,
            decorators: true,
            decoratorsBeforeExport: true,
            topLevelAwait: true,
            importMeta: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
  resolver: require.resolve('@atls/jest-resolver'),
}

export const integration = {
  testTimeout: 240_000,
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  transformIgnorePatterns: ['/node_modules/?!(camelcase)'],
  testRegex: '/integration/.*\\.test\\.(ts|tsx)$',
  modulePathIgnorePatterns: ['dist'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid)$': 'jest-static-stubs/$1',
  },
  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': [
      require.resolve('@swc/jest'),
      {
        minify: false,
        jsc: {
          parser: {
            syntax: 'typescript',
            jsx: true,
            dynamicImport: true,
            privateMethod: true,
            functionBind: true,
            exportDefaultFrom: true,
            exportNamespaceFrom: true,
            decorators: true,
            decoratorsBeforeExport: true,
            topLevelAwait: true,
            importMeta: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
  resolver: require.resolve('@atls/jest-resolver'),
}
