const tsJestResolver = require('ts-jest-resolver')

module.exports = (request, options) => {
  if (request === 'pnpapi') {
    return require.resolve('pnpapi', { paths: [options.basedir] })
  }

  return tsJestResolver(request, options)
}
