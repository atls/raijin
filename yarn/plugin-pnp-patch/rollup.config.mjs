import cjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import esbuild from 'rollup-plugin-esbuild'
import { brotliCompressSync } from 'node:zlib'

const wrapOutput = () => ({
  name: 'wrap-output',
  generateBundle(options, bundle, isWrite) {
    const bundles = Object.keys(bundle)
    if (bundles.length !== 1) throw new Error(`Expected only one bundle, got ${bundles.length}`)

    const outputBundle = bundle[bundles[0]]

    outputBundle.code = `import { brotliDecompressSync } from 'node:zlib';\n\nlet hook: string | undefined;\n\nexport const getContent = (): string => {\n  if (typeof hook === \`undefined\`)\n    hook = brotliDecompressSync(Buffer.from('${brotliCompressSync(
      outputBundle.code.replace(/\r\n/g, '\n')
    ).toString('base64')}', 'base64')).toString();\n\n  return hook;\n};\n`
  },
})

export default [
  {
    input: './src/esm-loader/loader.ts',
    output: {
      file: './src/esm-loader/loader.content.ts',
      format: 'esm',
      generatedCode: 'es2015',
    },
    plugins: [
      resolve({
        extensions: ['.mjs', '.js', '.ts', '.tsx', '.json'],
        rootDir: join(fileURLToPath(new URL('.', import.meta.url)), '../../'),
        jail: join(fileURLToPath(new URL('.', import.meta.url)), '../../'),
        preferBuiltins: true,
      }),
      esbuild({ tsconfig: false, target: 'node14' }),
      cjs({ requireReturnsDefault: `preferred` }),
      wrapOutput(),
    ],
  },
]
