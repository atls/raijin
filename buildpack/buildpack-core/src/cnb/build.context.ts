import { BuildpackPlan } from './buildpack.plan'
import { Launch }        from './launch'
import { Layers }        from './layers'

export class BuildContext {
  launch = new Launch()

  constructor(
    readonly workingDir: string,
    readonly buildpackPath: string,
    readonly layers: Layers,
    readonly plan: BuildpackPlan
  ) {}

  addWebProcess(command: string[]) {
    this.launch.addWebProcess(command)
  }
}
