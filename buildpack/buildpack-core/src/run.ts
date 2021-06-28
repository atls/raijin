import path            from 'path'

import { ExitHandler } from './cnb'
import { Detector }    from './cnb'
import { Builder }     from './cnb'
import { Config }      from './cnb'
import { build }       from './build'
import { detect }      from './detect'

export const run = async (detector: Detector, builder?: Builder) => {
  const config = new Config(process.argv.slice(1, process.argv.length))

  const phase = path.basename(config.arguments[0])

  if (!['detect', 'build'].includes(phase)) {
    ExitHandler.error(new Error(`Unsupported phase ${phase}`))
  }

  try {
    if (phase === 'detect') {
      await detect(detector, config)
    } else if (phase === 'build') {
      if (builder) {
        await build(builder, config)
      }
    }
  } catch (error) {
    ExitHandler.error(error)
  }
}
