import babel from 'prettier/parser-babel';
import typescript from 'prettier/parser-typescript';
import { format } from 'prettier/standalone';
let printer;
format('const n = 5;', {
    plugins: [babel, typescript],
    parser(text, { typescript: ts }, options) {
        const plugin = options.plugins.find((x) => x.printers && x.printers.estree);
        printer = plugin.printers.estree;
        return ts(text);
    },
});
const nodeImportSize = (node) => {
    if (node.specifiers.length === 0) {
        return 0;
    }
    const specifier = node.specifiers[node.specifiers.length - 1];
    const offset = specifier.imported ? 8 : 6;
    return specifier.loc.end.column + offset;
};
export const print = (path, options, prnt) => {
    const node = path.getNode();
    const plugin = options.plugins.find((p) => { var _a; return (_a = p === null || p === void 0 ? void 0 : p.printers) === null || _a === void 0 ? void 0 : _a.estree; });
    let result = plugin.printers.estree.print(path, options, prnt);
    if (node.type === 'ImportDeclaration') {
        result = result.map((part) => {
            if (Array.isArray(part) && part[0] === ' from' && node.alignOffset > 0) {
                const fill = Array.apply(0, Array(node.alignOffset)).fill(' ').join('');
                part[0] = `${fill} from`;
            }
            return part;
        });
    }
    return result;
};
export const preprocess = (ast, options) => {
    const imports = ast.body.filter((node) => node.type === 'ImportDeclaration' && node.loc && node.loc.end.line === node.loc.start.line);
    const maxAlignLength = imports.length > 0 ? Math.max(...imports.map((node) => nodeImportSize(node))) : 0;
    ast.body.forEach((node, index) => {
        if (node.type === 'ImportDeclaration' &&
            node.loc &&
            node.loc.end.line === node.loc.start.line) {
            node.alignOffset = 0;
            const nodeLength = nodeImportSize(node);
            node.alignOffset = nodeLength < maxAlignLength ? maxAlignLength - nodeLength : 0;
        }
    });
    return ast;
};
export const printers = {
    'typescript-custom': {
        ...printer,
        preprocess,
        print,
    },
};
