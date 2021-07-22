module.exports = (request, options) => {
  if (request === 'pnpapi') {
    return require.resolve('pnpapi', { paths: [options.basedir] })
  }

  return options.defaultResolver(request, options)
}
