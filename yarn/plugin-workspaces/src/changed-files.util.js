import { execUtils } from '@yarnpkg/core';
export const getLocalChangedFiles = async (project, gitRange) => {
    const { stdout } = await execUtils.execvp('git', ['diff', '--name-only', ...(gitRange ? [gitRange] : [])], {
        cwd: project.cwd,
        strict: true,
    });
    return stdout.split(/\r?\n/);
};
