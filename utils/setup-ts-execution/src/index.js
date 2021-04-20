// eslint-disable-next-line
const { dirname } = require('path')

// eslint-disable-next-line
const { workspaces } = require('../../../package.json')

const workspacesPaths = workspaces.map((workspace) => {
  const [workspacePath] = workspace.split('/')

  return `/${workspacePath}/`
})

// eslint-disable-next-line
require(`@babel/register`)({
  root: dirname(__dirname),
  extensions: [`.tsx`, `.ts`],
  only: [(request) => workspacesPaths.some((workspace) => request.includes(workspace))],
  plugins: [
    require.resolve(`@babel/plugin-transform-modules-commonjs`),
    require.resolve(`@babel/plugin-proposal-optional-chaining`),
    require.resolve(`@babel/plugin-proposal-nullish-coalescing-operator`),
    [require.resolve(`@babel/plugin-proposal-decorators`), { legacy: true }],
    [require.resolve(`@babel/plugin-proposal-class-properties`), { loose: true }],
    require.resolve(`@babel/plugin-proposal-async-generator-functions`),
  ],
  presets: [require.resolve(`@babel/preset-typescript`), require.resolve(`@babel/preset-react`)],
})
