export default {
  compilerOptions: {
    lib: ['dom', 'dom.iterable', 'esnext'],

    declaration: false,

    emitDecoratorMetadata: true,
    experimentalDecorators: true,

    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    importHelpers: false,
    isolatedModules: false,
    module: 'esnext',
    moduleResolution: 'node',
    noFallthroughCasesInSwitch: true,

    noImplicitAny: false,
    noImplicitReturns: false,
    noImplicitThis: false,

    noUnusedLocals: false,
    noUnusedParameters: false,

    pretty: true,
    removeComments: true,
    resolveJsonModule: true,

    strict: true,
    strictPropertyInitialization: false,

    sourceMap: false,
    target: 'es2017',

    jsx: 'react',

    outDir: './dist',
  },
  exclude: [
    'integration',
    'node_modules',
    'src/**/*.spec.ts',
    'src/**/*.test.ts',
    'src/**/*.story.ts',
    'src/**/*.stories.ts',
    '**/*/dist/**/*.d.ts',
    'integration/**/*.test.ts',
  ],
}
