/**
 * Tipos mínimos do binding D1, declarados como tipos "normais" (não
 * ambientes/globais) para não colidir com o DOM lib usado pelos `<script>`
 * client-side dos componentes .astro. O pacote `@cloudflare/workers-types`
 * faz essa colisão porque redeclara globais como Element/Node de forma
 * incompatível com o lib.dom.ts padrão.
 *
 * Cobre só os métodos usados no projeto. Em runtime, o objeto real é o D1
 * fornecido pela Cloudflare — este arquivo não implementa nada, só tipa.
 */

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<D1Result>;
}

export interface R2Object {
  key: string;
  size: number;
  httpMetadata?: { contentType?: string };
}

export interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}

export interface R2ObjectBody extends R2Object {
  arrayBuffer(): Promise<ArrayBuffer>;
  body: ReadableStream;
  /** Presente só quando o GET usou `range` — o trecho efetivamente retornado. */
  range?: R2Range;
}

export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | Blob | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<R2Object>;
  get(key: string, options?: { range?: R2Range | Headers }): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}
