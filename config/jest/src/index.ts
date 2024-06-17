import type { Config } from 'jest'

export const unit: Config = {
  transformIgnorePatterns: ['/node_modules/?!(camelcase)', '\\.pnp\\.[^\\/]+$'],
  modulePathIgnorePatterns: ['dist', 'integration'],
  testRegex: '\\.test\\.(ts|tsx)$',
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid|ttf|woff|woff2|eot|otf)$':
      '@atls/jest-static-stubs/$1',
  },
  globals: {},
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.jsx'],
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
  resolver: require.resolve('@monstrs/jest-resolver'),
}

export const integration: Config = {
  transformIgnorePatterns: ['/node_modules/?!(camelcase)'],
  testRegex: '/integration/.*\\.test\\.(ts|tsx)$',
  modulePathIgnorePatterns: ['dist'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid|ttf|woff|woff2|eot|otf)$':
      '@atls/jest-static-stubs/$1',
  },
  globals: {},
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.jsx'],
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
  resolver: require.resolve('@monstrs/jest-resolver'),
}
