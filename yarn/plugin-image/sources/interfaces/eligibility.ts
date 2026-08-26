export type EligibleWorkspaceReference = {
  location: string
  name: string
}

export type WorkspaceEligibilityResult = {
  eligibleWorkspaces: [EligibleWorkspaceReference, ...Array<EligibleWorkspaceReference>]
}
