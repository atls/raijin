import { xfs } from '@yarnpkg/fslib';
import { makeTemporaryEnv } from './utils';
jest.setTimeout(150000);
describe('yarn', () => {
    describe('commands', () => {
        describe('format', () => {
            test('it should split imports', makeTemporaryEnv({}, async ({ path, run, source }) => {
                await run('install');
                const filePath = `${path}/split-imports.ts`;
                await xfs.writeFilePromise(filePath, `
import { a, b } from './c'
import { d } from './e'
`);
                await run('format');
                await expect(xfs.readFilePromise(filePath, 'utf8')).resolves.toMatchSnapshot();
            }));
            test('it should order imports', makeTemporaryEnv({}, async ({ path, run, source }) => {
                await run('install');
                const filePath = `${path}/order-imports.ts`;
                await xfs.writeFilePromise(filePath, `
import { a } from './c'
import { b } from '@scope/name'
import type { c } from './d'
          `);
                await run('format');
                await expect(xfs.readFilePromise(filePath, 'utf8')).resolves.toMatchSnapshot();
            }));
            test('it should align imports', makeTemporaryEnv({}, async ({ path, run, source }) => {
                await run('install');
                const filePath = `${path}/align-imports.ts`;
                await xfs.writeFilePromise(filePath, `
import { first } from './a'
import { second } from './a'
import type { type } from './a'
import third from './a'
          `);
                await run('format');
                await expect(xfs.readFilePromise(filePath, 'utf8')).resolves.toMatchSnapshot();
            }));
        });
    });
});
