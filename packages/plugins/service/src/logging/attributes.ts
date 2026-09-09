import { LOGGER_NAMESPACE_ATTRIBUTE_NAME } from '@atls/logger'

export const LOG_STACK_ATTRIBUTE_NAME = '@stack'
export const MIKRO_ORM_SQL_ATTRIBUTE_NAME = '@mikro-orm-sql'
export const MIKRO_ORM_PARAMS_ATTRIBUTE_NAME = '@mikro-orm-params'

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === 'string'

export const isRenderableLogAttributes = (attributes: Record<string, unknown>): boolean => {
  const namespace = attributes[LOGGER_NAMESPACE_ATTRIBUTE_NAME]
  const stack = attributes[LOG_STACK_ATTRIBUTE_NAME]
  const mikroOrmSql = attributes[MIKRO_ORM_SQL_ATTRIBUTE_NAME]
  const mikroOrmParams = attributes[MIKRO_ORM_PARAMS_ATTRIBUTE_NAME]

  return (
    isOptionalString(namespace) &&
    isOptionalString(stack) &&
    isOptionalString(mikroOrmSql) &&
    (mikroOrmParams === undefined ||
      (Array.isArray(mikroOrmParams) && mikroOrmParams.every((value) => typeof value === 'string')))
  )
}
