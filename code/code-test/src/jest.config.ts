import { base }       from '@atls/code-typescript'
import { accessSync } from 'fs'
import { join }       from 'path'

const isFileExists = (file: string) => {
  try {
    accessSync(file)

    return true
  } catch {
    return false
  }
}

export const buildUnitConfig = (root: string) => ({
  transformIgnorePatterns: ['/node_modules/', '\\.pnp\\.[^\\/]+$'],
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
  globalSetup: isFileExists(join(root, '.config/test/unit/setup.ts'))
    ? join(root, '.config/test/unit/setup.ts')
    : undefined,
  globalTeardown: isFileExists(join(root, '.config/test/unit/teardown.ts'))
    ? join(root, '.config/test/unit/teardown.ts')
    : undefined,
})

export const buildIntegrationConfig = (root: string) => ({
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
  globalSetup: isFileExists(join(root, '.config/test/integration/setup.ts'))
    ? join(root, '.config/test/integration/setup.ts')
    : undefined,
  globalTeardown: isFileExists(join(root, '.config/test/integration/teardown.ts'))
    ? join(root, '.config/test/integration/teardown.ts')
    : undefined,
})
