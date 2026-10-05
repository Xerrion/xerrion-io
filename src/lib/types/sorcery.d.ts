declare module 'sorcery' {
  export interface InputSourceMap {
    version: number
    sources: string[]
    sourcesContent?: Array<string | null>
    names: string[]
    mappings: string
    sourceRoot?: string
  }

  interface SourceMap {
    toString(): string
  }

  interface SourceMapChain {
    apply(): SourceMap
    write(): Promise<unknown[]>
  }

  export function load(file: string, options?: {
    content?: Record<string, string>
    sourcemaps?: Record<string, InputSourceMap>
  }): Promise<SourceMapChain | null>
}
