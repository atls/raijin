module.exports = {
  testRegex: '\\.test\\.(ts|tsx)$',
  modulePathIgnorePatterns: ['dist'],
  snapshotSerializers: [require.resolve('@emotion/jest/serializer')],
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|gif|png|mp4|mkv|avi|webm|swf|wav|mid)$': 'jest-static-stubs/$1',
  },
  globals: {
    'ts-jest': {
      tsConfig: require.resolve('@atlantis-lab/tsconfig/tsconfig.base.json'),
      diagnostics: false,
    },
  },
  transform: {
    '^.+\\.[tj]sx?$': require.resolve('ts-jest'),
  },
}
