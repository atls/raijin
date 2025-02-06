import { Project } from "@yarnpkg/core";
import { join } from "path";

const PACKAGE_NAME = "@atls/schematics";

export const getCollectionPath = (project: Project): string => {
  const workspaces = project.workspaces;
  const schematicsWorkspace = workspaces.find((workspace) => {
    const { name } = workspace.manifest.raw;
    return name === PACKAGE_NAME;
  });
  if (!schematicsWorkspace)
    throw new Error(`Workspace ${PACKAGE_NAME} not found`);
  const { cwd } = schematicsWorkspace;
  const collectionPath = join(cwd, "dist", "collection.json");
  return collectionPath;
};
