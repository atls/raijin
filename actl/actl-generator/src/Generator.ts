import { GeneratorOptions } from './types'

export class Generator<T> {
  public constructor(private readonly options: GeneratorOptions) {}

  public async generate(): Promise<T> {
    const entries = []

    if (this.options.defaultHandler !== null) {
      entries.push([this.options.defaultHandler, this.options.allProperties])
    }

    const promises = entries
      .concat(Array.from(this.options.strategyRouter.entries()))
      .map(async ([handler, properties]) => {
        const rawResult = await handler()

        return properties.reduce((result, property) => {
          let patch = null

          if (property !== undefined) {
            patch = {
              [property]: typeof rawResult === 'object' ? rawResult[property] : rawResult,
            }
          }

          return { ...result, ...patch }
        }, {} as T)
      })

    const results = await Promise.all(promises)

    return results.reduce((result, chunk) => ({ ...result, ...chunk }), {})
  }
}
