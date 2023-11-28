export default {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  jsxSingleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  importOrder: ['^react(.*)$', '^@pages/(.*)', '^@fragments/(.*)$', '^@ui/(.*)$', '^@stores/(.*)$', '^@shared/(.*)$', '^@globals/(.*)$', '^@utils/(.*)$', '^[./]'],
  importOrderSeparation: true,
  importOrderCaseInsensitive: true,
  importOrderGroupNamespaceSpecifiers: true,
  plugins: [require.resolve('@trivago/prettier-plugin-sort-imports')]
}
