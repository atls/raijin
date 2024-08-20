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
    moduleResolution: 'NodeNext',
    noFallthroughCasesInSwitch: true,

    noImplicitAny: true,
    noImplicitReturns: true,
    noImplicitThis: true,

    noUnusedLocals: false,
    noUnusedParameters: false,

    pretty: true,
    removeComments: true,
    resolveJsonModule: true,

    strict: true,
    strictPropertyInitialization: false,

    sourceMap: false,

    module: 'NodeNext',
    target: 'es2022',

    jsx: 'react',

    outDir: './dist',
  },
  exclude: [
    '**/*/next-env.d.ts',
    'integration',
    'node_modules',
    'src/**/*.spec.ts',
    'src/**/*.test.ts',
    'src/**/*.story.ts',
    'src/**/*.stories.ts',
    '**/*/dist/**/*.d.ts',
    'integration/**/*.test.ts',
    '.idea',
  ],
}
