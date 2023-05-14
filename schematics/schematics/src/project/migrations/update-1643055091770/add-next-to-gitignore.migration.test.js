import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { join } from 'path';
describe('schematics', () => {
    describe('migrations', () => {
        let tree;
        let schematicRunner;
        beforeEach(() => {
            tree = new UnitTestTree(Tree.empty());
            schematicRunner = new SchematicTestRunner('@atls/schematics', join(__dirname, '../../migrations.json'));
        });
        it('should add .next to gitignore', async () => {
            const result = await schematicRunner
                .runSchematicAsync('add-next-output-to-gitignore', {}, tree)
                .toPromise();
            expect(result.read('.gitignore').toString()).toContain('.next');
        });
    });
});
