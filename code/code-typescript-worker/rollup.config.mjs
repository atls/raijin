import cjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import path from 'node:path'
import json from '@rollup/plugin-json'
import { fileURLToPath } from 'node:url'
import esbuild from 'rollup-plugin-esbuild'
import { brotliCompressSync } from 'node:zlib'
import analyze from 'rollup-plugin-analyzer'

const __filename = fileURLToPath(import.meta.url)

const __dirname = path.dirname(__filename)

const wrapOutput = () => ({
  name: 'wrap-output',
  generateBundle(options, bundle, isWrite) {
    const bundles = Object.keys(bundle)
    if (bundles.length !== 1) throw new Error(`Expected only one bundle, got ${bundles.length}`)

    const outputBundle = bundle[bundles[0]]

    outputBundle.code = `let hook;\n\nmodule.exports.getContent = () => {\n  if (typeof hook === \`undefined\`)\n    hook = require('zlib').brotliDecompressSync(Buffer.from('${brotliCompressSync(
      outputBundle.code.replace(/\r\n/g, '\n')
    ).toString('base64')}', 'base64')).toString();\n\n  return hook;\n};\n`
  },
})

export default [
  {
    external: ['pnpapi', 'typescript'],
    input: './src/typescript.worker.source.ts',
    output: {
      file: './src/typescript.worker.content.js',
      format: 'cjs',
      strict: false,
      generatedCode: {
        constBindings: true,
      },
    },
    plugins: [
      analyze(),
      resolve({
        extensions: ['.mjs', '.js', '.ts', '.tsx', '.json'],
        rootDir: path.join(__dirname, '../../'),
        jail: path.join(__dirname, '../../'),
        preferBuiltins: true,
      }),
      esbuild({ tsconfig: false, target: 'node18' }),
      cjs({
        transformMixedEsModules: true,
        extensions: ['.js', '.ts'],
        ignoreDynamicRequires: true,
      }),
      json(),
      wrapOutput(),
    ],
  },
]
