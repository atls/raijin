export const FORCE_UNPLUGGED_PACKAGES = new Set([
  'nan',
  'node-gyp',
  'node-pre-gyp',
  'node-addon-api',
  'fsevents',
  'core-js',
  'core-js-pure',
  'protobufjs',
])

export const UNUSED_EXTERNALS = [
  // nestjs
  'cli-color',
  'flaschenpost',
  'amqp-connection-manager',
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
