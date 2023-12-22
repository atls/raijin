import tsconfig from '@atls/config-typescript'

export const unit = {
  transformIgnorePatterns: ['/node_modules/', '\\.pnp\\.[^\\/]+$'],
  testRegex: '\\.test\\.(ts|tsx)$',
  modulePathIgnorePatterns: ['dist', 'integration'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid|ttf|woff|woff2|eot|otf)$':
      '@atls/jest-static-stubs/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: tsconfig.compilerOptions,
      isolatedModules: true,
      diagnostics: false,
    },
  },
  transform: {
    '^.+\\.[tj]sx?$': require.resolve('ts-jest'),
  },
  resolver: require.resolve('@monstrs/jest-pnp-resolver'),
}

export const integration = {
  testRegex: '/integration/.*\\.test\\.(ts|tsx)$',
  modulePathIgnorePatterns: ['dist'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid|ttf|woff|woff2|eot|otf)$':
      '@atls/jest-static-stubs/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: tsconfig.compilerOptions,
      isolatedModules: true,
      diagnostics: false,
    },
  },
  transform: {
    '^.+\\.[tj]sx?$': require.resolve('ts-jest'),
  },
  resolver: require.resolve('@monstrs/jest-pnp-resolver'),
}
