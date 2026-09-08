#!/usr/bin/env node
/**
 * Guarda-trilho para testes de interface que gravam no banco local (D1).
 *
 * Testes manuais ou automatizados no navegador (Editor Visual, Aparência,
 * Formas) gravam de verdade no mesmo banco local que o desenvolvedor vê em
 * tempo real. Sem isso, um teste esquecido de restaurar deixa cor, forma ou
 * texto de teste no site — foi exatamente o que aconteceu com a cor de
 * título global numa rodada anterior.
 *
 * Uso:
 *   node scripts/ui-test-db.mjs snapshot [rótulo]
 *     -> grava `settings` e `pages` inteiros num arquivo JSON em
 *        .testing/db-snapshots/<timestamp>-<rótulo>.json e imprime o caminho.
 *
 *   node scripts/ui-test-db.mjs restore <arquivo-do-snapshot>
 *     -> regrava exatamente essas linhas, sobrescrevendo o estado atual.
 *
 *   node scripts/ui-test-db.mjs restore --last
 *     -> restaura o snapshot mais recente em .testing/db-snapshots/.
 *
 * Regra de uso: SEMPRE tirar um `snapshot` antes de qualquer teste de
 * interface que grave no banco (Aparência, Editor Visual, Formas, Mídia) e
 * SEMPRE rodar `restore` com esse arquivo depois — inclusive se o teste
 * falhar ou for interrompido. Não é só uma prática recomendada: é o
 * mecanismo que substitui "lembrar de limpar na mão".
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const DB_NAME = 'essencial-saude-db';
const SNAPSHOT_DIR = resolve('.testing/db-snapshots');
// Tabelas que as telas de admin testadas manualmente costumam alterar.
// `pages` guarda o conteúdo/aparência de cada página; `settings` guarda a
// paleta global e os demais ajustes do painel.
const TABLES = ['settings', 'pages'];

/**
 * Sempre via `--file`, nunca `--command` com a string inline: no Windows o
 * `npx` só resolve através do shell, e o shell reinterpreta `*`, aspas e
 * `;` de um SQL antes do wrangler ver o comando. Um arquivo temporário não
 * passa por esse reprocessamento.
 */
function d1(sql) {
  const file = join(tmpdir(), `ui-test-db-${randomUUID()}.sql`);
  writeFileSync(file, sql, 'utf8');
  try {
    // No Windows, `npx` só existe como `.cmd`, que o Node só executa direto
    // via `shell: true` — todos os argumentos aqui são fixos ou controlados
    // por este script (nome do banco, caminho do arquivo temporário), nunca
    // texto externo, então a reinterpretação do shell é segura.
    const out = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', DB_NAME, '--local', '--json', '--file', file],
      { encoding: 'utf8', shell: process.platform === 'win32' }
    );
    const parsed = JSON.parse(out);
    return parsed[0]?.results ?? [];
  } finally {
    rmSync(file, { force: true });
  }
}

function quote(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function doSnapshot(label) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const dump = {};
  for (const table of TABLES) {
    dump[table] = d1(`SELECT * FROM ${table}`);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${stamp}${label ? '-' + label.replace(/[^a-z0-9_-]/gi, '') : ''}.json`;
  const path = join(SNAPSHOT_DIR, filename);
  writeFileSync(path, JSON.stringify(dump, null, 2));
  console.log(`Snapshot salvo: ${path}`);
  console.log('Depois do teste, restaure com:');
  console.log(`  node scripts/ui-test-db.mjs restore "${path}"`);
  return path;
}

function latestSnapshot() {
  const files = readdirSync(SNAPSHOT_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const last = files.at(-1);
  if (!last) throw new Error('Nenhum snapshot encontrado em ' + SNAPSHOT_DIR);
  return join(SNAPSHOT_DIR, last);
}

function doRestore(pathArg) {
  const path = pathArg === '--last' ? latestSnapshot() : resolve(pathArg);
  const dump = JSON.parse(readFileSync(path, 'utf8'));

  for (const table of TABLES) {
    const rows = dump[table];
    if (!Array.isArray(rows)) continue;

    // Restaura linha a linha por chave primária conhecida — nunca um
    // DELETE+INSERT do zero, que perderia linhas criadas DEPOIS do snapshot
    // (ex.: uma página nova) em vez de só desfazer o que o teste mudou.
    for (const row of rows) {
      const cols = Object.keys(row);
      const assignments = cols.map((c) => `${c} = ${quote(row[c])}`).join(', ');
      const pk = table === 'settings' ? 'key' : 'id';
      d1(`UPDATE ${table} SET ${assignments} WHERE ${pk} = ${quote(row[pk])}`);
    }
  }
  console.log(`Restaurado a partir de: ${path}`);
}

const [, , cmd, arg] = process.argv;

if (cmd === 'snapshot') {
  doSnapshot(arg);
} else if (cmd === 'restore') {
  if (!arg) {
    console.error('Uso: node scripts/ui-test-db.mjs restore <arquivo|--last>');
    process.exit(1);
  }
  doRestore(arg);
} else {
  console.error('Uso: node scripts/ui-test-db.mjs snapshot [rótulo] | restore <arquivo|--last>');
  process.exit(1);
}
