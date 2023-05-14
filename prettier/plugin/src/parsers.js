import sortImports from 'import-sort';
import sortPackageJson from 'sort-package-json';
import { parsers as babelParsers } from 'prettier/parser-babel';
import { parsers as typescriptParsers } from 'prettier/parser-typescript';
import { ImportSortParser } from './import-sort';
import { style } from './import-sort';
const preprocess = (source, { plugins }) => {
    const plugin = plugins.find((p) => { var _a; return (_a = p.parsers) === null || _a === void 0 ? void 0 : _a.typescript; });
    const { code } = sortImports(source, new ImportSortParser(plugin.parsers.typescript.parse(source)), style);
    return code;
};
const parse = (source, _, { plugins }) => {
    const plugin = plugins.find((p) => { var _a; return (_a = p.parsers) === null || _a === void 0 ? void 0 : _a.typescript; });
    const program = plugin.parsers.typescript.parse(source);
    const bodyLength = program.body.length;
    const nodes = [...program.body].reverse();
    nodes.forEach((node, nodeIndex) => {
        if (node.type === 'ImportDeclaration') {
            if (node.specifiers.length > 1) {
                const index = bodyLength - nodeIndex - 1;
                program.body.splice(index, 1);
                node.specifiers.forEach((_, specifierIndex) => {
                    program.body.splice(index + specifierIndex, 0, {
                        ...node,
                        specifiers: node.specifiers.filter((_, i) => specifierIndex === i),
                    });
                });
            }
        }
    });
    return program;
};
export const parsers = {
    typescript: {
        ...typescriptParsers.typescript,
        astFormat: 'typescript-custom',
        preprocess,
        parse,
    },
    'json-stringify': {
        ...babelParsers['json-stringify'],
        preprocess(text, options) {
            if (babelParsers['json-stringify'].preprocess) {
                text = babelParsers['json-stringify'].preprocess(text, options);
            }
            return options.filepath && /(^|\\|\/)package\.json$/.test(options.filepath)
                ? sortPackageJson(text)
                : text;
        },
    },
};
