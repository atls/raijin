import type { Writable } from 'node:stream'

import { WriteStream }   from 'node:tty'

import { Configuration } from '@yarnpkg/core'
import { MessageName }   from '@yarnpkg/core'
import { formatUtils }   from '@yarnpkg/core'

export class SpinnerProgress {
  static PROGRESS_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

  static PROGRESS_INTERVAL = 120

  private running = false

  private position = 0

  constructor(
    private readonly stdout: Writable,
    private readonly configuration: Configuration
  ) {}

  start() {
    if ((this.stdout as WriteStream).isTTY && !process.env.TOOLS_DISABLE_PROGRESS) {
      this.running = true
      this.write()
      this.tick()
    }
  }

  end() {
    if ((this.stdout as WriteStream).isTTY && this.running) {
      this.running = false
      this.clear(true)
    }
  }

  private tick() {
    setTimeout(() => {
      if (this.running) {
        this.clear()
        this.write()

        this.position =
          this.position === SpinnerProgress.PROGRESS_FRAMES.length - 1 ? 0 : this.position + 1

        this.tick()
      }
    }, SpinnerProgress.PROGRESS_INTERVAL)
  }

  private write() {
    const spinner = SpinnerProgress.PROGRESS_FRAMES[this.position]

    const name = formatUtils.pretty(
      this.configuration,
      `YN${MessageName.UNNAMED.toString(10).padStart(4, '0')}`,
      'gray'
    )

    this.stdout.write(
      `${formatUtils.pretty(this.configuration, '➤', 'blueBright')} ${name}: │ ${spinner}\n`
    )
  }

  private clear(complete = false) {
    this.stdout.write(`\x1b[${0}A`)

    if (complete) {
      this.stdout.write('\x1b[0J')
    }
  }
}
