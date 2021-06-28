import { BuildContext }  from './cnb'
import { ExitHandler }   from './cnb'
import { Builder }       from './cnb'
import { Layers }        from './cnb'
import { Config }        from './cnb'
import { BuildpackPlan } from './cnb'

export const build = async (builder: Builder, config: Config) => {
  if (config.arguments.length !== 4) {
    ExitHandler.error(new Error(`Expected 3 arguments and received ${config.arguments.length - 1}`))
  }

  try {
    const context = new BuildContext(
      process.cwd(),
      process.env.CNB_BUILDPACK_DIR
        ? process.env.CNB_BUILDPACK_DIR
        : config.arguments[0].replace('/bin/build', ''),
      new Layers(config.arguments[1]),
      BuildpackPlan.load(config.arguments[3])
    )

    await builder.build(context)

    context.layers.save()
    context.launch.save(context.layers.path)
  } catch (error) {
    ExitHandler.error(error)
  }
}
