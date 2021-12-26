import { parse }              from '@iarna/toml'

import fs                     from 'fs'

import { BuildpackPlanEntry } from './buildpack-plan.entry'

export class BuildpackPlan {
  constructor(readonly entries: BuildpackPlanEntry[]) {}

  static load(planPath: string) {
    const { entries = [] }: any = parse(fs.readFileSync(planPath).toString())

    return new BuildpackPlan(
      entries.map((entry) => new BuildpackPlanEntry(entry.name, entry.version, entry.metadata))
    )
  }

  getEntry(name: string) {
    return this.entries.find((entry) => entry.name === name)
  }
}
