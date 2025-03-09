export const LAZY_IMPORTS = [
  // @nestjs/microservices
  '@grpc/grpc-js',
  'mqtt',
  'nats',

  // sql
  'mariadb/callback',
  'better-sqlite3',
  'pg-native',
  'hdb-pool',
  'oracledb',
  'mongodb',
  'tedious',
  'sqlite3',
  'mysql',
  'mysql2',
  'mssql',
  'sql.js',
  'libsql',

  // mikro-orm
  '@mikro-orm/better-sqlite',
  '@mikro-orm/mongodb',
  '@mikro-orm/mariadb',
  '@mikro-orm/sqlite',
  '@mikro-orm/mysql',

  // nestjs
  '@nestjs/mongoose',
  '@nestjs/typeorm/dist/common/typeorm.utils',
  '@nestjs/sequelize/dist/common/sequelize.utils',
]
