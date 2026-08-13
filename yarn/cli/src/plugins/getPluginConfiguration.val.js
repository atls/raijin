// Note that this file isn't the real export - it is run at build-time and its
// return value is what's used within the bundle (cf val-loader).

/* eslint-disable */

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const getPluginConfigurationSource = ({ modules, plugins }) => {
  const pluginRequests = new Set(plugins)
  const importSegment = modules
    .map((request, index) => {
      return `import * as _${index} from ${JSON.stringify(request)};\n`
    })
    .join(``)

  const moduleSegment = `  modules: new Map([\n${modules
    .map((request, index) => {
      const packageJson = require(`${request}/package.json`)
      // ESM package scope adds an extra Node interop wrapper around CJS plugin modules.
      const moduleReference =
        pluginRequests.has(request) && packageJson.type !== 'module'
          ? `_${index}.default`
          : `_${index}`

      return `    [${JSON.stringify(packageJson.name)}, ${moduleReference}],\n`
    })
    .join(``)}  ]),\n`

  const pluginSegment = `  plugins: new Set([\n${plugins
    .map((request) => {
      return `    ${JSON.stringify(require(`${request}/package.json`).name)},\n`
    })
    .join(``)}  ]),\n`

  return {
    code: [
      importSegment,
      `export const getPluginConfiguration = () => ({\n`,
      moduleSegment,
      pluginSegment,
      `});\n`,
    ].join(`\n`),
  }
}

export { getPluginConfigurationSource as 'module.exports' }
