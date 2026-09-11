import { runRaijinInitializer } from './initializer/index.js'

try {
  await runRaijinInitializer({ argv: process.argv.slice(2) })
} catch (error) {
  if (error instanceof Error) {
    process.stderr.write(`${error.message}\n`)
  } else {
    process.stderr.write(`${String(error)}\n`)
  }

  process.exitCode = 1
}
