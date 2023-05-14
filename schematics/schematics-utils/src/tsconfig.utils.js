import { updateJsonInTree } from './json.utils';
export const updateTsConfigInTree = (compilerOptions) => updateJsonInTree('tsconfig.json', (tsconfig) => ({
    ...tsconfig,
    compilerOptions,
}));
