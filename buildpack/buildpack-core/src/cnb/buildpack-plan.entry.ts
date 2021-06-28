export class BuildpackPlanEntry {
  constructor(
    readonly name: string,
    readonly version: string | null = null,
    readonly metadata: { [key: string]: string } = {}
  ) {}
}
