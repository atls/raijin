import { RAIJIN_INITIALIZER_USAGE_MESSAGE } from './initializer/exceptions/usage.js'
import { runRaijinInitializer }             from './initializer/index.js'

try {
  const argv = process.argv.slice(2)

  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    process.stdout.write(`${RAIJIN_INITIALIZER_USAGE_MESSAGE}\n`)
  } else {
    await runRaijinInitializer({ argv })
  }
} catch (error) {
  if (error instanceof Error) {
    process.stderr.write(`${error.message}\n`)
  } else {
    process.stderr.write(`${String(error)}\n`)
  }

  process.exitCode = 1
}
