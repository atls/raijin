import cjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { fileURLToPath} from 'node:url'
import { join } from 'node:path'
import json from '@rollup/plugin-json'
import esbuild from 'rollup-plugin-esbuild'
import { brotliCompressSync } from 'node:zlib'
import replace from '@rollup/plugin-replace'

const wrapOutput = () => ({
  name: 'wrap-output',
  generateBundle(options, bundle, isWrite) {
    const bundles = Object.keys(bundle)
    if (bundles.length !== 1) throw new Error(`Expected only one bundle, got ${bundles.length}`)

    const outputBundle = bundle[bundles[0]]

    outputBundle.code = `import { brotliDecompressSync } from 'zlib';\n\nlet hook;\n\nexport const getContent = () => {\n  if (typeof hook === \`undefined\`)\n    hook = brotliDecompressSync(Buffer.from('${brotliCompressSync(
      outputBundle.code.replace(/\r\n/g, '\n')
    ).toString('base64')}', 'base64')).toString();\n\n  return hook;\n};\n`
  },
})

export default [
  {
    external: ['pnpapi', 'fsevents'],
    input: './src/schematics.worker.source.ts',
    output: {
      file: './src/schematics.worker.content.ts',
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
      replace({
        delimiters: ['', ''],
        values: {
          "require('readable-stream/transform')": "require('stream').Transform",
          'require("readable-stream/transform")': 'require("stream").Transform',
          'readable-stream': 'stream',
        },
      }),
      esbuild({ tsconfig: false, target: 'node14' }),
      cjs({ requireReturnsDefault: `preferred` }),
      json(),
      wrapOutput(),
    ],
  },
]
