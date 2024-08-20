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
  moduleName,
  naturally,
  member,
  not,
  startsWithLowerCase,
  startsWithUpperCase,
}: IStyleAPI): Array<IStyleItem> => {
  const noMember = [
    {
      // import 'foo'
      match: and(hasNoMember, isAbsoluteModule, not(isWorkspaceModule)),
      sort: moduleName(naturally),
    },
    {
      // import '@scope/foo'
      match: and(hasNoMember, isAbsoluteModule, isWorkspaceModule),
      sort: moduleName(naturally),
    },
    {
      // import './foo'
      match: and(hasNoMember, isRelativeModule),
      sort: moduleName(naturally),
    },
  ]

  const typesAbsolute = [
    {
      // import type * as foo from 'bar'
      match: and(isImportType, isAbsoluteModule, hasNamespaceMember),
      sort: moduleName(naturally),
    },
    {
      // import type { Foo } from 'baz'
      match: and(isImportType, isAbsoluteModule, hasOnlyNamedMembers, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    {
      // import type { foo } from 'baz'
      match: and(isImportType, isAbsoluteModule, hasOnlyNamedMembers, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },
    {
      // import type Foo from 'bar'
      match: and(isImportType, isAbsoluteModule, hasDefaultMember, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    {
      // import type foo from 'bar'
      match: and(isImportType, isAbsoluteModule, hasDefaultMember, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },
  ]

  const typesRelative = [
    {
      // import type * as foo from 'bar'
      match: and(isImportType, isRelativeModule, hasNamespaceMember),
      sort: moduleName(naturally),
    },
    {
      // import type { Foo } from 'baz'
      match: and(isImportType, isRelativeModule, hasOnlyNamedMembers, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    {
      // import type { foo } from 'baz'
      match: and(isImportType, isRelativeModule, hasOnlyNamedMembers, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },
    {
      // import type Foo from 'bar'
      match: and(isImportType, isRelativeModule, hasDefaultMember, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    {
      // import type foo from 'bar'
      match: and(isImportType, isRelativeModule, hasDefaultMember, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },
  ]

  const node = [
    {
      // import 'node:*'
      match: isNodeModule,
      sort: moduleName(naturally),
    },
  ]

  const modules = [
    {
      // import * as foo from '@foo/bar'
      match: and(isScopedModule, not(isWorkspaceModule), hasNamespaceMember),
      sort: moduleName(naturally),
    },
    {
      // import { Foo } from '@foo/baz'
      match: and(
        isScopedModule,
        not(isWorkspaceModule),
        hasOnlyNamedMembers,
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },
    {
      // import { foo } from '@foo/baz'
      match: and(
        isScopedModule,
        not(isWorkspaceModule),
        hasOnlyNamedMembers,
        member(startsWithLowerCase)
      ),
      sort: moduleName(naturally),
    },
    {
      // import Foo from '@foo/bar'
      match: and(
        isScopedModule,
        not(isWorkspaceModule),
        hasDefaultMember,
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },
    {
      // import foo from '@foo/bar'
      match: and(
        isScopedModule,
        not(isWorkspaceModule),
        hasDefaultMember,
        member(startsWithLowerCase)
      ),
      sort: moduleName(naturally),
    },
    {
      // import * as foo from 'bar'
      match: and(isAbsoluteModule, not(isWorkspaceModule), not(isScopedModule), hasNamespaceMember),
      sort: moduleName(naturally),
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
      sort: moduleName(naturally),
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
      sort: moduleName(naturally),
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
      sort: moduleName(naturally),
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
      sort: moduleName(naturally),
    },
  ]

  const workspaces = [
    {
      // import * as foo from '@scope/bar'
      match: and(isWorkspaceModule, hasNamespaceMember),
      sort: moduleName(naturally),
    },
    {
      // import { Foo } from '@scope/baz'
      match: and(isWorkspaceModule, hasOnlyNamedMembers, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    {
      // import { foo } from '@scope/baz'
      match: and(isWorkspaceModule, hasOnlyNamedMembers, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },
    {
      // import Foo from '@scope/bar'
      match: and(isWorkspaceModule, hasDefaultMember, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    {
      // import foo from '@scope/bar'
      match: and(isWorkspaceModule, hasDefaultMember, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },
  ]

  const local = [
    {
      // import * as foo from './bar'
      match: and(isRelativeModule, hasNamespaceMember),
      sort: moduleName(naturally),
    },
    {
      // import { Foo } from './baz'
      match: and(isRelativeModule, hasOnlyNamedMembers, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    {
      // import { foo } from './baz'
      match: and(isRelativeModule, hasOnlyNamedMembers, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },
    {
      // import Foo from './bar'
      match: and(isRelativeModule, hasDefaultMember, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    {
      // import foo from './bar'
      match: and(isRelativeModule, hasDefaultMember, member(startsWithLowerCase)),
      sort: moduleName(naturally),
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
