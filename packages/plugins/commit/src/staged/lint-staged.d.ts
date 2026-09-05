declare module 'lint-staged' {
  export interface Options {
    concurrent?: boolean | number
    maxArgLength?: number
    shell?: boolean | string
  }

  export default function lintStaged(options?: Options): Promise<boolean>
}
