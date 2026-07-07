import assert    from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { test }  from 'node:test'

const runNode = async (args: Array<string>): Promise<{ status: number | null; output: string }> =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const chunks: Array<Buffer> = []

    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk))
    child.on('close', (status) => {
      resolve({
        status,
        output: Buffer.concat(chunks).toString(),
      })
    })
  })

test('should resolve committed ESM loader JavaScript specifiers to TSX candidates', async () => {
  const result = await runNode([
    '--loader',
    './.pnp.loader.mjs',
    '-e',
    "await import('./yarn/plugin-typescript/sources/typecheck.command.js')",
  ])

  assert.equal(result.status, 0, result.output)
})
