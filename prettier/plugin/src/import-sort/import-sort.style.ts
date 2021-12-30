import { IStyleAPI }            from 'import-sort-style'
import { IStyleItem }           from 'import-sort-style'

import { isWorkspaceModule }    from './import-sort.api'
import { isNodeModule }         from './import-sort.api'
import { isOrganizationModule } from './import-sort.api'
import { isImportType }         from './import-sort.api'

export const style = (styleApi: IStyleAPI): IStyleItem[] => {
  const {
    and,
    hasDefaultMember,
    hasNamedMembers,
    hasNamespaceMember,
    hasNoMember,
    hasOnlyDefaultMember,
    hasOnlyNamedMembers,
    hasOnlyNamespaceMember,
    isAbsoluteModule,
    isRelativeModule,
    member,
    not,
    startsWithAlphanumeric,
    startsWithLowerCase,
    startsWithUpperCase,
    moduleName,
    naturally,
    unicode,
    alias,
  } = styleApi

  return [
    // import 'foo'
    { match: and(hasNoMember, isAbsoluteModule, not(isWorkspaceModule)) },
    { separator: true },

    // import '@scope/foo'
    { match: and(hasNoMember, isWorkspaceModule) },
    { separator: true },

    // import './foo'
    { match: and(hasNoMember, isRelativeModule) },
    { separator: true },

    // import 'node:*'
    { match: isNodeModule, sort: moduleName(naturally) },
    { separator: true },

    // import * as _ from 'bar';
    {
      match: and(hasOnlyNamespaceMember, isImportType, not(member(startsWithAlphanumeric))),
      sort: moduleName(naturally),
    },
    // import * as Foo from 'bar';
    {
      match: and(hasOnlyNamespaceMember, isImportType, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    // import * as foo from 'bar';
    {
      match: and(hasOnlyNamespaceMember, isImportType, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },

    // import _, * as bar from 'baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isImportType,
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
    },
    // import Foo, * as bar from 'baz';
    {
      match: and(hasDefaultMember, hasNamespaceMember, isImportType, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    // import foo, * as bar from 'baz';
    {
      match: and(hasDefaultMember, hasNamespaceMember, isImportType, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },

    // import _ from 'bar';
    {
      match: and(hasOnlyDefaultMember, isImportType, not(member(startsWithAlphanumeric))),
      sort: moduleName(naturally),
    },
    // import Foo from 'bar';
    {
      match: and(hasOnlyDefaultMember, isImportType, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    // import foo from 'bar';
    {
      match: and(hasOnlyDefaultMember, isImportType, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },

    // import _, {bar, …} from 'baz';
    {
      match: and(
        hasDefaultMember,
        hasNamedMembers,
        isImportType,
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import Foo, {bar, …} from 'baz';
    {
      match: and(hasDefaultMember, hasNamedMembers, isImportType, member(startsWithUpperCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import foo, {bar, …} from 'baz';
    {
      match: and(hasDefaultMember, hasNamedMembers, isImportType, member(startsWithLowerCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },

    // import {_, bar, …} from 'baz';
    {
      match: and(hasOnlyNamedMembers, isImportType, not(member(startsWithAlphanumeric))),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import {Foo, bar, …} from 'baz';
    {
      match: and(hasOnlyNamedMembers, isImportType, member(startsWithUpperCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import {foo, bar, …} from 'baz';
    {
      match: and(hasOnlyNamedMembers, isImportType, member(startsWithLowerCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },

    { separator: true },

    // import * as _ from '@foo/bar';
    {
      match: and(
        hasOnlyNamespaceMember,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
    },
    // import * as Foo from '@foo/bar';
    {
      match: and(
        hasOnlyNamespaceMember,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },
    // import * as foo from '@foo/bar';
    {
      match: and(
        hasOnlyNamespaceMember,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        member(startsWithLowerCase)
      ),
      sort: moduleName(naturally),
    },

    // import _, * as bar from '@foo/baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
    },
    // import Foo, * as bar from '@foo/baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },
    // import foo, * as bar from '@foo/baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },

    // import _ from '@foo/bar';
    {
      match: and(
        hasOnlyDefaultMember,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
    },
    // import Foo from '@foo/bar';
    {
      match: and(
        hasOnlyDefaultMember,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },
    // import foo from '@foo/bar';
    {
      match: and(
        hasOnlyDefaultMember,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        member(startsWithLowerCase)
      ),
      sort: moduleName(naturally),
    },

    // import _, {bar, …} from '@foo/baz';
    {
      match: and(
        hasDefaultMember,
        hasNamedMembers,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import Foo, {bar, …} from '@foo/baz';
    {
      match: and(
        hasDefaultMember,
        hasNamedMembers,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import foo, {bar, …} from '@foo/baz';
    {
      match: and(
        hasDefaultMember,
        hasNamedMembers,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        member(startsWithLowerCase)
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },

    // import {_, bar, …} from '@foo/baz';
    {
      match: and(
        hasOnlyNamedMembers,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import {Foo, bar, …} from '@foo/baz';
    {
      match: and(
        hasOnlyNamedMembers,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import {foo, bar, …} from '@foo/baz';
    {
      match: and(
        hasOnlyNamedMembers,
        isAbsoluteModule,
        isOrganizationModule,
        not(isWorkspaceModule),
        member(startsWithLowerCase)
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },

    { separator: true },

    // import * as _ from 'bar';
    {
      match: and(
        hasOnlyNamespaceMember,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
    },
    // import * as Foo from 'bar';
    {
      match: and(
        hasOnlyNamespaceMember,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },
    // import * as foo from 'bar';
    {
      match: and(
        hasOnlyNamespaceMember,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        member(startsWithLowerCase)
      ),
      sort: moduleName(naturally),
    },

    // import _, * as bar from 'baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
    },
    // import Foo, * as bar from 'baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },
    // import foo, * as bar from 'baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },

    // import _ from 'bar';
    {
      match: and(
        hasOnlyDefaultMember,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
    },
    // import Foo from 'bar';
    {
      match: and(
        hasOnlyDefaultMember,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },
    // import foo from 'bar';
    {
      match: and(
        hasOnlyDefaultMember,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        member(startsWithLowerCase)
      ),
      sort: moduleName(naturally),
    },

    // import _, {bar, …} from 'baz';
    {
      match: and(
        hasDefaultMember,
        hasNamedMembers,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import Foo, {bar, …} from 'baz';
    {
      match: and(
        hasDefaultMember,
        hasNamedMembers,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import foo, {bar, …} from 'baz';
    {
      match: and(
        hasDefaultMember,
        hasNamedMembers,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        member(startsWithLowerCase)
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },

    // import {_, bar, …} from 'baz';
    {
      match: and(
        hasOnlyNamedMembers,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import {Foo, bar, …} from 'baz';
    {
      match: and(
        hasOnlyNamedMembers,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import {foo, bar, …} from 'baz';
    {
      match: and(
        hasOnlyNamedMembers,
        isAbsoluteModule,
        not(isWorkspaceModule),
        not(isOrganizationModule),
        member(startsWithLowerCase)
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },

    { separator: true },

    // import * as _ from '@scope/bar';
    {
      match: and(hasOnlyNamespaceMember, isWorkspaceModule, not(member(startsWithAlphanumeric))),
      sort: moduleName(naturally),
    },
    // import * as Foo from '@scope/bar';
    {
      match: and(hasOnlyNamespaceMember, isWorkspaceModule, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    // import * as foo from '@scope/bar';
    {
      match: and(hasOnlyNamespaceMember, isWorkspaceModule, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },

    // import _, * as bar from '@scope/baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isWorkspaceModule,
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
    },
    // import Foo, * as bar from '@scope/baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isWorkspaceModule,
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },
    // import foo, * as bar from '@scope/baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isWorkspaceModule,
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },

    // import _ from '@scope/bar';
    {
      match: and(hasOnlyDefaultMember, isWorkspaceModule, not(member(startsWithAlphanumeric))),
      sort: moduleName(naturally),
    },
    // import Foo from '@scope/bar';
    {
      match: and(hasOnlyDefaultMember, isWorkspaceModule, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    // import foo from '@scope/bar';
    {
      match: and(hasOnlyDefaultMember, isWorkspaceModule, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },

    // import _, {bar, …} from '@scope/baz';
    {
      match: and(
        hasDefaultMember,
        hasNamedMembers,
        isWorkspaceModule,
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import Foo, {bar, …} from '@scope/baz';
    {
      match: and(hasDefaultMember, hasNamedMembers, isWorkspaceModule, member(startsWithUpperCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import foo, {bar, …} from '@scope/baz';
    {
      match: and(hasDefaultMember, hasNamedMembers, isWorkspaceModule, member(startsWithLowerCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },

    // import {_, bar, …} from '@scope/baz';
    {
      match: and(hasOnlyNamedMembers, isWorkspaceModule, not(member(startsWithAlphanumeric))),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import {Foo, bar, …} from '@scope/baz';
    {
      match: and(hasOnlyNamedMembers, isWorkspaceModule, member(startsWithUpperCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import {foo, bar, …} from '@scope/baz';
    {
      match: and(hasOnlyNamedMembers, isWorkspaceModule, member(startsWithLowerCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },

    { separator: true },

    // import * as _ from './bar';
    {
      match: and(hasOnlyNamespaceMember, isRelativeModule, not(member(startsWithAlphanumeric))),
      sort: moduleName(naturally),
    },
    // import * as Foo from './bar';
    {
      match: and(hasOnlyNamespaceMember, isRelativeModule, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    // import * as foo from './bar';
    {
      match: and(hasOnlyNamespaceMember, isRelativeModule, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },

    // import _, * as bar from './baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isRelativeModule,
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
    },
    // import Foo, * as bar from './baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isRelativeModule,
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },
    // import foo, * as bar from './baz';
    {
      match: and(
        hasDefaultMember,
        hasNamespaceMember,
        isRelativeModule,
        member(startsWithUpperCase)
      ),
      sort: moduleName(naturally),
    },

    // import _ from './bar';
    {
      match: and(hasOnlyDefaultMember, isRelativeModule, not(member(startsWithAlphanumeric))),
      sort: moduleName(naturally),
    },
    // import Foo from './bar';
    {
      match: and(hasOnlyDefaultMember, isRelativeModule, member(startsWithUpperCase)),
      sort: moduleName(naturally),
    },
    // import foo from './bar';
    {
      match: and(hasOnlyDefaultMember, isRelativeModule, member(startsWithLowerCase)),
      sort: moduleName(naturally),
    },

    // import _, {bar, …} from './baz';
    {
      match: and(
        hasDefaultMember,
        hasNamedMembers,
        isRelativeModule,
        not(member(startsWithAlphanumeric))
      ),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import Foo, {bar, …} from './baz';
    {
      match: and(hasDefaultMember, hasNamedMembers, isRelativeModule, member(startsWithUpperCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import foo, {bar, …} from './baz';
    {
      match: and(hasDefaultMember, hasNamedMembers, isRelativeModule, member(startsWithLowerCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },

    // import {_, bar, …} from './baz';
    {
      match: and(hasOnlyNamedMembers, isRelativeModule, not(member(startsWithAlphanumeric))),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import {Foo, bar, …} from './baz';
    {
      match: and(hasOnlyNamedMembers, isRelativeModule, member(startsWithUpperCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },
    // import {foo, bar, …} from './baz';
    {
      match: and(hasOnlyNamedMembers, isRelativeModule, member(startsWithLowerCase)),
      sort: moduleName(naturally),
      sortNamedMembers: alias(unicode),
    },

    { separator: true },
  ]
}
