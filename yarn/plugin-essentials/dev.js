const { default: plugin } = require('./src/index')

module.exports = {
  name: `@atls/plugin-essentials`,
  factory: () => plugin,
}
