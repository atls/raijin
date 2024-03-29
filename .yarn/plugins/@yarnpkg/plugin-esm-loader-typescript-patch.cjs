/* eslint-disable */
//prettier-ignore

const replacements = [
  {
    from: `function transformSource(source, format) {`,
    to: `function transformSource(source, format, ext) {`
  },
  {
    from: 'loader: `ts`,',
    to: `loader: ext === 'tsx' ? 'tsx' : 'ts',`
  },
  {
    from: `source: transformSource(result.source, context.format)`,
    to: `source: transformSource(result.source, context.format, urlString.includes('.tsx') ? 'tsx' : 'ts')`
  },
  {
    from: `source: transformSource(source, format),`,
    to: `source: transformSource(source, format, filePath.includes('.tsx') ? 'tsx' : 'ts'),`
  },
  {
    from: `.replace(/\\.(c|m)?js$/, \`.$1ts\`)`,
    to: `.replace(/\\.(c|m)?js$/, '.$1ts').replace(/\\.(c|m)?jsx$/, '.$1tsx')`
  },
  {
    from: 'case `.ts`: {',
    to: `case \`.tsx\`: {
		const pkg = readPackageScope(filepath);
		if (!pkg)
		  return \`commonjs\`;
		return (_a = pkg.data.type) != null ? _a : \`commonjs\`;
	  }
      case \`.ts\`: {
      `
  }
]

module.exports = {
  name: "@yarnpkg/plugin-esm-loader-typescript-patch",
  factory: function (require) {
    const plugin = {
      hooks: {
        async afterAllInstalled(project) {
          const { xfs } = require('@yarnpkg/fslib')

          const esmLoader = process.cwd() + '/.pnp.loader.mjs';

          if (await xfs.existsPromise(esmLoader)) {
            const content = await xfs.readFilePromise(esmLoader, 'utf-8')
            
            const patched = replacements.reduce((result, replacement) => result.replace(replacement.from, replacement.to), content)

            await xfs.changeFilePromise(esmLoader, patched, {
              automaticNewlines: true,
              mode: 0o644,
            })
          }
        },
      },
    };

    return plugin;
  }
};
    