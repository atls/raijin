import { GeneratorOptions, fn } from './types'

export class GeneratorOptionsBuilder<T> {
  private static readonly defaultOptionsFactory = (): GeneratorOptions => {
    return {
      allProperties: [],
      defaultHandler: null,
      strategyRouter: new Map(),
    }
  }

  private readonly options: GeneratorOptions

  public constructor(options?: GeneratorOptions) {
    this.options = Object.assign(GeneratorOptionsBuilder.defaultOptionsFactory(), options)
  }

  public pick(key: keyof T): this {
    this.options.allProperties.push(String(key))
    return this
  }

  public getOptions() {
    return this.options
  }

  public setHandler(key: keyof T, handler: fn<any>) {
    const { strategyRouter } = this.options
    const properties = strategyRouter.get(handler)

    if (properties === undefined) {
      strategyRouter.set(handler, [String(key)])
    } else {
      properties.push(String(key))
    }

    if (!this.options.allProperties.includes(String(key))) {
      this.options.allProperties.push(String(key))
    }

    return this
  }

  public setDefaultResolver(resolver: fn<any>): this {
    if (this.options.defaultHandler === null) {
      this.unsetDefaultResolver()
    }

    this.options.defaultHandler = resolver

    return this
  }

  public unsetDefaultResolver(): boolean {
    if (this.options.defaultHandler === null) {
      return false
    }

    this.options.defaultHandler = null

    return true
  }
}
