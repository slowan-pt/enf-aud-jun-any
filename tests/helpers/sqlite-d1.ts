/**
 * Adaptador mínimo D1Database sobre `node:sqlite` (Node 22+, experimental).
 *
 * Diferente dos mocks feitos à mão usados no resto dos testes (que só
 * simulam o formato do retorno), este roda a query de verdade num SQLite
 * real — pega bugs que um mock não pegaria, como o de
 * src/lib/settings.ts:getSettings, em que a consulta tinha 9 placeholders
 * (`?1`..`?9`) mas 10 valores eram passados ao `.bind()`: um mock ingênuo
 * simplesmente ignora os valores em excesso; o SQLite de verdade lança
 * "column index out of range", exatamente o que D1 faz em produção.
 */
import { DatabaseSync } from 'node:sqlite';
import type { D1Database, D1PreparedStatement, D1Result } from '../../src/lib/cf-types';

export function createSqliteD1(schema: string): D1Database {
  const raw = new DatabaseSync(':memory:');
  raw.exec(schema);

  function prepare(query: string): D1PreparedStatement {
    let boundArgs: unknown[] = [];
    const stmt: D1PreparedStatement = {
      bind(...values: unknown[]) {
        boundArgs = values;
        return stmt;
      },
      async first<T>(): Promise<T | null> {
        const row = raw.prepare(query).get(...(boundArgs as never[]));
        return (row as T) ?? null;
      },
      async run(): Promise<D1Result> {
        const info = raw.prepare(query).run(...(boundArgs as never[]));
        return {
          results: [],
          success: true,
          meta: { last_row_id: Number(info.lastInsertRowid), changes: info.changes },
        };
      },
      async all<T>(): Promise<D1Result<T>> {
        const rows = raw.prepare(query).all(...(boundArgs as never[]));
        return { results: rows as T[], success: true, meta: {} };
      },
    };
    return stmt;
  }

  return {
    prepare,
    async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
      const out: D1Result[] = [];
      for (const statement of statements) out.push(await statement.run());
      return out;
    },
    async exec(query: string): Promise<D1Result> {
      raw.exec(query);
      return { results: [], success: true, meta: {} };
    },
  };
}
