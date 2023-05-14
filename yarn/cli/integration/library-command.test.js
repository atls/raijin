import { xfs } from '@yarnpkg/fslib';
import { makeTemporaryEnv } from './utils';
jest.setTimeout(150000);
describe('yarn', () => {
    describe('commands', () => {
        describe('library', () => {
            test('it should build withouth errors', makeTemporaryEnv({
                dependencies: {
                    typescript: '^4.5.3',
                },
            }, async ({ path, run, source }) => {
                await run('install');
                await xfs.mkdirPromise(`${path}/src`);
                await xfs.writeFilePromise(`${path}/src/index.ts`, 'export const test = (n: number) => n * 2');
                const { code } = await run('library', 'build');
                expect(code).toBe(0);
                await expect(xfs.readFilePromise(`${path}/dist/index.js`, 'utf8')).resolves.toContain('const test = (n) => n * 2;');
            }));
        });
    });
});
