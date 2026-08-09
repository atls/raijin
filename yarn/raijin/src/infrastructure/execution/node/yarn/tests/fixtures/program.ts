const mode = process.argv[2]

switch (mode) {
  case 'binary': {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const { stderr, stdout } = await promisify(execFile)('tsc', ['--version'], {
      encoding: 'utf8',
    })

    process.stdout.write(stdout)
    process.stderr.write(stderr)
    break
  }
  case 'fail':
    process.exitCode = 7
    break
  case 'report': {
    const { Configuration } = await import('@yarnpkg/core')

    process.stdout.write(
      JSON.stringify({
        argument: process.argv[3],
        callerTitle: process.title,
        dependencyLoaded: typeof Configuration === 'function',
        nodeOptions: process.env.NODE_OPTIONS,
        preserved: process.env.RAIJIN_TEST_VALUE,
        removed: process.env.RAIJIN_REMOVE_ME,
      })
    )
    break
  }
  case 'signal':
    process.kill(process.pid, 'SIGTERM')
    break
  case 'stream':
    process.stdout.write('x'.repeat(256 * 1024))
    break
  case 'wait':
    setInterval(() => undefined, 1000)
    break
  case 'write-and-fail':
    process.stdout.write('ready')
    process.exitCode = 7
    break
  default:
    throw new Error(`Unsupported managed Node fixture mode: ${String(mode)}`)
}
