import { stringify }     from '@iarna/toml'

import fs                from 'fs'

import { DetectContext } from './cnb'
import { ExitHandler }   from './cnb'
import { Detector }      from './cnb'
import { Config }        from './cnb'

export const detect = async (detector: Detector, config: Config) => {
  if (config.arguments.length !== 3) {
    ExitHandler.error(new Error(`Expected 2 arguments and received ${config.arguments.length - 1}`))
  }

  const context = new DetectContext(
    process.cwd(),
    process.env.CNB_BUILDPACK_DIR
      ? process.env.CNB_BUILDPACK_DIR
      : config.arguments[0].replace('/bin/detect', '')
  )

  try {
    const result = await detector.detect(context)

    if (result) {
      fs.writeFileSync(config.arguments[2], stringify(result))
    } else {
      ExitHandler.fail()
    }
  } catch (error) {
    ExitHandler.error(error)
  }
}
