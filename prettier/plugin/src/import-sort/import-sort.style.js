import { isWorkspaceModule } from './import-sort.api';
import { isNodeModule } from './import-sort.api';
import { isOrganizationModule } from './import-sort.api';
import { isImportType } from './import-sort.api';
export const style = (styleApi) => {
    const { and, hasDefaultMember, hasNamedMembers, hasNamespaceMember, hasNoMember, hasOnlyDefaultMember, hasOnlyNamedMembers, hasOnlyNamespaceMember, isAbsoluteModule, isRelativeModule, member, not, startsWithAlphanumeric, startsWithLowerCase, startsWithUpperCase, moduleName, naturally, unicode, alias, } = styleApi;
    return [
        { match: and(hasNoMember, isAbsoluteModule, not(isWorkspaceModule)) },
        { separator: true },
        { match: and(hasNoMember, isWorkspaceModule) },
        { separator: true },
        { match: and(hasNoMember, isRelativeModule) },
        { separator: true },
        { match: isNodeModule, sort: moduleName(naturally) },
        { separator: true },
        {
            match: and(hasOnlyNamespaceMember, isImportType, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyNamespaceMember, isImportType, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyNamespaceMember, isImportType, member(startsWithLowerCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isImportType, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isImportType, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isImportType, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isImportType, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isImportType, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isImportType, member(startsWithLowerCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isImportType, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isImportType, member(startsWithUpperCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isImportType, member(startsWithLowerCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isImportType, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isImportType, member(startsWithUpperCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isImportType, member(startsWithLowerCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        { separator: true },
        {
            match: and(hasOnlyNamespaceMember, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyNamespaceMember, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyNamespaceMember, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), member(startsWithLowerCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), member(startsWithLowerCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), member(startsWithLowerCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isAbsoluteModule, isOrganizationModule, not(isWorkspaceModule), member(startsWithLowerCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        { separator: true },
        {
            match: and(hasOnlyNamespaceMember, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyNamespaceMember, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyNamespaceMember, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), member(startsWithLowerCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), member(startsWithLowerCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), member(startsWithLowerCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), member(startsWithUpperCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isAbsoluteModule, not(isWorkspaceModule), not(isOrganizationModule), member(startsWithLowerCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        { separator: true },
        {
            match: and(hasOnlyNamespaceMember, isWorkspaceModule, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyNamespaceMember, isWorkspaceModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyNamespaceMember, isWorkspaceModule, member(startsWithLowerCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isWorkspaceModule, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isWorkspaceModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isWorkspaceModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isWorkspaceModule, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isWorkspaceModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isWorkspaceModule, member(startsWithLowerCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isWorkspaceModule, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isWorkspaceModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isWorkspaceModule, member(startsWithLowerCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isWorkspaceModule, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isWorkspaceModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isWorkspaceModule, member(startsWithLowerCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        { separator: true },
        {
            match: and(hasOnlyNamespaceMember, isRelativeModule, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyNamespaceMember, isRelativeModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyNamespaceMember, isRelativeModule, member(startsWithLowerCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isRelativeModule, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isRelativeModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamespaceMember, isRelativeModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isRelativeModule, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isRelativeModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasOnlyDefaultMember, isRelativeModule, member(startsWithLowerCase)),
            sort: moduleName(naturally),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isRelativeModule, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isRelativeModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasDefaultMember, hasNamedMembers, isRelativeModule, member(startsWithLowerCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isRelativeModule, not(member(startsWithAlphanumeric))),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isRelativeModule, member(startsWithUpperCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        {
            match: and(hasOnlyNamedMembers, isRelativeModule, member(startsWithLowerCase)),
            sort: moduleName(naturally),
            sortNamedMembers: alias(unicode),
        },
        { separator: true },
    ];
};
