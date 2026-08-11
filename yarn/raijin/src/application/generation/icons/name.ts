import camelcase from 'camelcase'

export const createIconComponentName = (name: string): string =>
  `${camelcase(name, { pascalCase: true })}Icon`
