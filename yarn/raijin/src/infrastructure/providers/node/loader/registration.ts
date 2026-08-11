export const create = (loaders: ReadonlyArray<string>): string =>
  `data:text/javascript,${encodeURIComponent(
    [
      'import { register } from "node:module";',
      'import { pathToFileURL } from "node:url";',
      ...loaders.map((loader) => `register(${JSON.stringify(loader)}, pathToFileURL("./"));`),
    ].join(' ')
  )}`

export const registerNodeLoaders = async (loaders: Array<string>): Promise<void> => {
  await import(create(loaders))
}
