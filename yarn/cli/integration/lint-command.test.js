import { xfs } from '@yarnpkg/fslib';
import { makeTemporaryEnv } from './utils';
jest.setTimeout(150000);
describe('yarn', () => {
    describe('commands', () => {
        describe('lint', () => {
            test('it should lint withouth errors', makeTemporaryEnv({
                dependencies: {
                    typescript: '^4.5.4',
                    eslint: '^8.4.1',
                },
            }, async ({ path, run, source }) => {
                await run('install');
                await xfs.writeFilePromise(`${path}/success.ts`, `
const n = (v: number) => v
n(5)
`);
                const { code, stdout } = await run('lint');
                expect(code).toBe(0);
                expect(stdout).toContain('➤ YN0000: ┌ Lint\n➤ YN0000: └ Completed\n➤ YN0000: Done');
            }));
        });
        test('it should lint with errors', makeTemporaryEnv({
            dependencies: {
                typescript: '^4.5.4',
                eslint: '^8.4.1',
            },
        }, async ({ path, run, source }) => {
            await run('install');
            await xfs.writeFilePromise(`${path}/invalid.ts`, 'const n = 5');
            try {
                await run('lint');
            }
            catch (error) {
                expect(error.code).toBe(1);
                expect(error.stdout).toContain("'n' is assigned a value but never used @typescript-eslint/no-unused-vars");
                expect(error.stdout).toContain('> 1 | const n = 5');
                expect(error.stdout).toContain('invalid.ts:1:7');
            }
        }));
    });
});
