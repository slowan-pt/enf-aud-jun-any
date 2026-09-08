#!/usr/bin/env node
/**
 * Sobe o site em modo dev contra o banco ISOLADO (ver isolated-test-db.mjs),
 * numa porta separada (4322) do dev normal (4321) — os dois nunca disputam
 * o mesmo `.wrangler/state`.
 *
 * Roda `node scripts/isolated-test-db.mjs init` antes, se a cópia ainda
 * não existir.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ISOLATED_DIR = resolve('.testing/isolated-wrangler-state');
const PORT = process.env.TEST_PORT || '4322';

if (!existsSync(ISOLATED_DIR)) {
  console.log('Banco isolado ainda não existe — criando...');
  const init = spawnSync('node', ['scripts/isolated-test-db.mjs', 'init'], {
    stdio: 'inherit',
  });
  if (init.status !== 0) process.exit(init.status ?? 1);
}

const env = { ...process.env, ISOLATED_TEST_DB_DIR: ISOLATED_DIR };
// --ignore-lock: roda ao lado do dev server normal (porta 4321) sem
// disputar o lock file do Astro nem tocar nele — os dois processos nunca
// interferem um no outro.
const child = spawnSync('npx', ['astro', 'dev', '--port', PORT, '--ignore-lock'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
});
process.exit(child.status ?? 0);
