import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { rename } from 'node:fs/promises'
import { rm } from 'node:fs/promises'

/**
 * @param {string} file
 * @param {Array<string>} args
 * @returns {Promise<void>}
 */
const run = async (file, args) =>
  /** @type {Promise<void>} */
  new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      stdio: 'inherit',
      shell: false,
    })

    child.on('error', reject)

    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve()

        return
      }

      const reason = signal ? `signal ${signal}` : `exit code ${code}`

      reject(new Error(`${file} ${args.join(' ')} failed with ${reason}`))
    })
  })

await run('yarn', ['workspace', '@atls/raijin', 'build'])

await rm('dist/runtime', { recursive: true, force: true })
await rm('bundles', { recursive: true, force: true })

await run(process.execPath, ['patches/version-postfix-toggle.mjs'])

try {
  await run('builder', [
    'build',
    'bundle',
    '--no-git-hash',
    '--format',
    'esm',
    '--target',
    'esnext',
    '--external-file',
    '../builder/externals.json',
  ])

  await rename('bundles/yarn.js', 'bundles/yarn.mjs')

  await run(process.execPath, ['patches/cli.patch.mjs'])

  await mkdir('dist/runtime', { recursive: true })
  await rename('bundles/yarn.mjs', 'dist/runtime/yarn.mjs')

  await run(process.execPath, ['scripts/runtime/bootstrap.js'])
} finally {
  await run(process.execPath, ['patches/version-postfix-toggle.mjs'])
}
