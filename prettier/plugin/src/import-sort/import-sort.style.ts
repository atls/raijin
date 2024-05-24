import type { IStyleAPI }    from 'import-sort-style'
import type { IStyleItem }   from 'import-sort-style'

import { isWorkspaceModule } from './import-sort.api.js'
import { isNodeModule }      from './import-sort.api.js'
import { isImportType }      from './import-sort.api.js'

export const style = ({
  and,
  hasDefaultMember,
  hasOnlyNamedMembers,
  hasNoMember,
  hasNamespaceMember,
  isAbsoluteModule,
  isRelativeModule,
  isScopedModule,
  member,
  not,
  startsWithLowerCase,
  startsWithUpperCase,
  moduleName,
  naturally,
}: IStyleAPI): Array<IStyleItem> => {
  const noMember = [
    {
      // import 'foo'
      match: and(hasNoMember, isAbsoluteModule, not(isWorkspaceModule)),
    },
    {
      // import '@scope/foo'
      match: and(hasNoMember, isAbsoluteModule, isWorkspaceModule),
    },
    {
      // import './foo'
      match: and(hasNoMember, isRelativeModule),
    },
  ]

  const typesAbsolute = [
    {
      // import type * as foo from 'bar'
      match: and(isImportType, isAbsoluteModule, hasNamespaceMember),
    },
    {
      // import type { Foo } from 'baz'
      match: and(isImportType, isAbsoluteModule, hasOnlyNamedMembers, member(startsWithUpperCase)),
    },
    {
      // import type { foo } from 'baz'
      match: and(isImportType, isAbsoluteModule, hasOnlyNamedMembers, member(startsWithLowerCase)),
    },
    {
      // import type Foo from 'bar'
      match: and(isImportType, isAbsoluteModule, hasDefaultMember, member(startsWithUpperCase)),
    },
    {
      // import type foo from 'bar'
      match: and(isImportType, isAbsoluteModule, hasDefaultMember, member(startsWithLowerCase)),
    },
  ]

  const typesRelative = [
    {
      // import type * as foo from 'bar'
      match: and(isImportType, isRelativeModule, hasNamespaceMember),
    },
    {
      // import type { Foo } from 'baz'
      match: and(isImportType, isRelativeModule, hasOnlyNamedMembers, member(startsWithUpperCase)),
    },
    {
      // import type { foo } from 'baz'
      match: and(isImportType, isRelativeModule, hasOnlyNamedMembers, member(startsWithLowerCase)),
    },
    {
      // import type Foo from 'bar'
      match: and(isImportType, isRelativeModule, hasDefaultMember, member(startsWithUpperCase)),
    },
    {
      // import type foo from 'bar'
      match: and(isImportType, isRelativeModule, hasDefaultMember, member(startsWithLowerCase)),
    },
  ]

  const node = [
    {
      // import 'node:*'
      match: isNodeModule,
    },
  ]

  const modules = [
    {
      // import * as foo from '@foo/bar'
      match: and(isScopedModule, not(isWorkspaceModule), hasNamespaceMember),
    },
    {
      // import { Foo } from '@foo/baz'
      match: and(
        isScopedModule,
        not(isWorkspaceModule),
        hasOnlyNamedMembers,
        member(startsWithUpperCase)
      ),
    },
    {
      // import { foo } from '@foo/baz'
      match: and(
        isScopedModule,
        not(isWorkspaceModule),
        hasOnlyNamedMembers,
        member(startsWithLowerCase)
      ),
    },
    {
      // import Foo from '@foo/bar'
      match: and(
        isScopedModule,
        not(isWorkspaceModule),
        hasDefaultMember,
        member(startsWithUpperCase)
      ),
    },
    {
      // import foo from '@foo/bar'
      match: and(
        isScopedModule,
        not(isWorkspaceModule),
        hasDefaultMember,
        member(startsWithLowerCase)
      ),
    },
    {
      // import * as foo from 'bar'
      match: and(isAbsoluteModule, not(isWorkspaceModule), not(isScopedModule), hasNamespaceMember),
    },
    {
      // import { Foo } from 'baz'
      match: and(
        isAbsoluteModule,
        not(isScopedModule),
        not(isWorkspaceModule),
        hasOnlyNamedMembers,
        member(startsWithUpperCase)
      ),
    },
    {
      // import { foo } from 'baz'
      match: and(
        isAbsoluteModule,
        not(isScopedModule),
        not(isWorkspaceModule),
        hasOnlyNamedMembers,
        member(startsWithLowerCase)
      ),
    },
    {
      // import Foo from 'bar'
      match: and(
        isAbsoluteModule,
        not(isScopedModule),
        not(isWorkspaceModule),
        hasDefaultMember,
        member(startsWithUpperCase)
      ),
    },
    {
      // import foo from 'bar'
      match: and(
        isAbsoluteModule,
        not(isScopedModule),
        not(isWorkspaceModule),
        hasDefaultMember,
        member(startsWithLowerCase)
      ),
    },
  ]

  const workspaces = [
    {
      // import * as foo from '@scope/bar'
      match: and(isWorkspaceModule, hasNamespaceMember),
    },
    {
      // import { Foo } from '@scope/baz'
      match: and(isWorkspaceModule, hasOnlyNamedMembers, member(startsWithUpperCase)),
    },
    {
      // import { foo } from '@scope/baz'
      match: and(isWorkspaceModule, hasOnlyNamedMembers, member(startsWithLowerCase)),
    },
    {
      // import Foo from '@scope/bar'
      match: and(isWorkspaceModule, hasDefaultMember, member(startsWithUpperCase)),
    },
    {
      // import foo from '@scope/bar'
      match: and(isWorkspaceModule, hasDefaultMember, member(startsWithLowerCase)),
    },
  ]

  const local = [
    {
      // import * as foo from './bar'
      match: and(isRelativeModule, hasNamespaceMember),
    },
    {
      // import { Foo } from './baz'
      match: and(isRelativeModule, hasOnlyNamedMembers, member(startsWithUpperCase)),
    },
    {
      // import { foo } from './baz'
      match: and(isRelativeModule, hasOnlyNamedMembers, member(startsWithLowerCase)),
    },
    {
      // import Foo from './bar'
      match: and(isRelativeModule, hasDefaultMember, member(startsWithUpperCase)),
    },
    {
      // import foo from './bar'
      match: and(isRelativeModule, hasDefaultMember, member(startsWithLowerCase)),
    },
  ]

  return [
    ...noMember,
    { separator: true },
    ...typesAbsolute,
    { separator: true },
    ...typesRelative,
    { separator: true },
    ...node,
    { separator: true },
    ...modules,
    { separator: true },
    ...workspaces,
    { separator: true },
    ...local,
    { separator: true },
  ]
}
