import { prepareProjectGeneration } from './project-generation/prepare.js'
import { runProjectGeneration } from './project-generation/run.js'
import { prepareSurface } from './surface/prepare.js'
import { runSurface } from './surface/run.js'

const scenarios = [
  {
    dependencies: { 'fixture-prettier-config': 'portal:./prettier-config' },
    name: 'surface',
    prepare: prepareSurface,
    run: runSurface,
  },
  {
    dependencies: {},
    name: 'project-generation',
    prepare: prepareProjectGeneration,
    run: runProjectGeneration,
  },
]

export const scenarioNames = scenarios.map(({ name }) => name)

/** @param {string | undefined} name */
export const selectScenarios = (name) =>
  name ? scenarios.filter((scenario) => scenario.name === name) : scenarios
