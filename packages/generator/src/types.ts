export type fn<T> = () => T | Promise<T>

export type GeneratorResolversRouter<T> = Map<fn<T>, string[]>

export interface GeneratorOptions {
  kdefaultHandler?: fn<any> | null
  readonly allProperties: string[]
  readonly strategyRouter: GeneratorResolversRouter<any>
}
