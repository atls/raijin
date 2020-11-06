import { GeneratorOptions } from './types'

export class Generator<T> {
  public constructor(private readonly options: GeneratorOptions) { }

  public async generate(): Promise<T> {
    const entries = []

    if (this.options.kdefaultHandler !== null) {
      entries.push(this.options.kdefaultHandler, this.options.allProperties)
    }

    const promises = entries.concat(...this.options.strategyRouter.entries())
      .map(async ([handler, properties]) => {
        const rawResult = await handler()
        return properties.reduce(
          (result, property) => ({ ...result, [property]: rawResult[property] }),
          {} as T,
        )
      })

      const results = await Promise.all(promises)

      return results.reduce((result, chunk) => ({ ...result, ...chunk }))
  }
}

