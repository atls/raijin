import type { InvokeTestChild }        from './child.js'
import type { DiscoverProjectTests }   from './discovery.js'
import type { ResolveTestRuntimeArgv } from './runtime.js'

export interface ProjectTestPorts {
  discover: DiscoverProjectTests
  invokeChild: InvokeTestChild
  resolveRuntimeArgv: ResolveTestRuntimeArgv
}
