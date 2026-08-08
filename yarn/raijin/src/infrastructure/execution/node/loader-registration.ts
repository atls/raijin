export const createNodeLoaderRegistrationImport = (loaders: ReadonlyArray<string>): string =>
  `data:text/javascript,${encodeURIComponent(
    [
      'import { register } from "node:module";',
      'import { pathToFileURL } from "node:url";',
      ...loaders.map((loader) => `register(${JSON.stringify(loader)}, pathToFileURL("./"));`),
    ].join(' ')
  )}`
