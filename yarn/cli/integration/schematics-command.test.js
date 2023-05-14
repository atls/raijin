import { xfs } from '@yarnpkg/fslib';
import { packageUtils } from './utils';
import { makeTemporaryEnv } from './utils';
jest.setTimeout(150000);
describe('yarn', () => {
    describe('commands', () => {
        describe('schematics', () => {
            test('it should init project', async () => {
                await makeTemporaryEnv({
                    dependencies: {
                        '@atls/schematics': await packageUtils.pack('@atls/schematics'),
                    },
                }, async ({ path, run, source }) => {
                    await run('install');
                    const { code } = await run('generate', 'project', '--type', 'project');
                    expect(code).toBe(0);
                    expect(xfs.existsPromise(`${path}/tsconfig.json`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/.gitignore`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/config/husky/.gitignore`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/config/husky/commit-msg`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/config/husky/pre-commit`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/config/husky/prepare-commit-msg`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/.github/workflows/checks.yaml`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/.github/workflows/preview.yaml`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/.github/workflows/release.yaml`)).resolves.toBe(true);
                });
            });
            test('it should init project libraries', async () => {
                await makeTemporaryEnv({
                    dependencies: {
                        '@atls/schematics': await packageUtils.pack('@atls/schematics'),
                    },
                }, async ({ path, run, source }) => {
                    await run('install');
                    const { code } = await run('generate', 'project', '--type', 'libraries');
                    expect(code).toBe(0);
                    expect(xfs.existsPromise(`${path}/tsconfig.json`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/.gitignore`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/config/husky/.gitignore`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/config/husky/commit-msg`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/config/husky/pre-commit`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/config/husky/prepare-commit-msg`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/.github/workflows/checks.yaml`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/.github/workflows/publish.yaml`)).resolves.toBe(true);
                    expect(xfs.existsPromise(`${path}/.github/workflows/version.yaml`)).resolves.toBe(true);
                });
            });
        });
    });
});
