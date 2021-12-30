import { Layer } from './layer'

export class Layers {
  private layers: Map<string, Layer> = new Map()

  constructor(readonly path: string) {}

  get(
    name: string,
    build: boolean = false,
    cache: boolean = false,
    launch: boolean = false
  ): Layer {
    if (this.layers.has(name)) {
      return this.layers.get(name)!
    }

    const layer = Layer.create(name, this.path, build, cache, launch)

    this.layers.set(name, layer)

    return layer
  }

  save() {
    for (const layer of this.layers.values()) {
      layer.save()
    }
  }
}
