import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { PortablePath }           from '@yarnpkg/fslib'
import { getPluginConfiguration } from '@yarnpkg/cli'

import fg                         from 'fast-glob'
import path                       from 'path'
import { promises as fs }         from 'fs'

const FORCE_UNPLUGGED_PACKAGES = new Set([
  'nan',
  'node-gyp',
  'node-pre-gyp',
  'node-addon-api',
  'fsevents',
  'core-js',
  'core-js-pure',
  'protobufjs',
])

export const unusedExternals = [
  // nestjs
  'cli-color',
  'flaschenpost',
  'amqp-connection-manager',
  'kafkajs',
  'amqplib',
  'redis',
  'mqtt',
  'nats',
  '@nestjs/websockets',

  // typeorm
  'typeorm-aurora-data-api-driver',
  'react-native-sqlite-storage',
  '@sap/hana-client',
  'better-sqlite3',
  'mongodb',
  'oracledb',
  'pg-native',
  'mysql',
  'ioredis',
  'hdb-pool',
  'mysql2',
  'mssql',
  'sql.js',

  // pnp
  'pnpapi',

  // nextjs
  'next',
]

export const getUnpluggedDependencies = async (): Promise<Set<string>> => {
  const configuration = await Configuration.find(
    process.cwd() as PortablePath,
    getPluginConfiguration()
  )

  const pnpUnpluggedFolder = configuration.get('pnpUnpluggedFolder') as string
  const dependenciesNames = new Set<string>()

  const entries = await fg('*/node_modules/*/package.json', {
    cwd: pnpUnpluggedFolder,
  })

  await Promise.all(
    entries
      .map((entry) => path.join(pnpUnpluggedFolder, entry))
      .map(async (entry) => {
        try {
          const { name } = JSON.parse((await fs.readFile(entry)).toString())

          if (name && !FORCE_UNPLUGGED_PACKAGES.has(name)) {
            dependenciesNames.add(name)
          }
        } catch {} // eslint-disable-line
      })
  )

  return dependenciesNames
}

export const getExternals = async (cwd: string): Promise<Array<string>> => {
  const configuration = await Configuration.find(
    process.cwd() as PortablePath,
    getPluginConfiguration()
  )

  const { project } = await Project.find(configuration, process.cwd() as PortablePath)

  const workspace = project.getWorkspaceByFilePath(cwd as PortablePath)

  const workspaceExternals: Array<string> = Object.keys(
    workspace?.manifest?.raw?.externalDependencies || {}
  )

  const unpluggedExternals: Array<string> = Array.from(await getUnpluggedDependencies())

  return Array.from(new Set([...workspaceExternals, ...unpluggedExternals, ...unusedExternals]))
}
