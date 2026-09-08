#!/usr/bin/env node
/**
 * Banco D1/R2/KV ISOLADO para testes de interface — nunca o banco de
 * desenvolvimento real do usuário.
 *
 * Antes deste script, os testes automatizados rodavam contra o MESMO
 * `.wrangler/state` que `npm run dev` usa — o mesmo banco que o usuário vê
 * em tempo real no próprio navegador. Um teste que se enganasse sobre o que
 * era "dado de teste" (já aconteceu) apagava dado real do usuário sem
 * nenhuma autorização. Este script cria uma CÓPIA separada do estado atual
 * (schema + seed reais, para o teste não rodar contra um banco vazio) num
 * diretório próprio, nunca tocado por `npm run dev` normal.
 *
 * Uso:
 *   node scripts/isolated-test-db.mjs init
 *     -> copia .wrangler/state para .testing/isolated-wrangler-state
 *   node scripts/isolated-test-db.mjs discard
 *     -> apaga só a cópia isolada; o `.wrangler/state` real nunca é tocado
 *
 * Para o SERVIDOR usar essa cópia: `npm run dev:isolated` (porta 4322,
 * separada da porta 4321 do dev normal) — ver scripts/dev-isolated.mjs e
 * astro.config.mjs (variável ISOLATED_TEST_DB_DIR).
 *
 * Guardas de segurança (recusam a execução, não apenas avisam):
 *   1. O diretório isolado é uma CONSTANTE fixa no código — nunca vem de
 *      argv/env, então não há como um argumento redirecionar isto para o
 *      `.wrangler/state` real por engano.
 *   2. Nunca chama `wrangler` com `--remote` — este script só copia e
 *      apaga arquivos locais, não fala com o Cloudflare.
 *   3. Recusa rodar se ISOLATED_TEST_DB_DIR já estiver definido apontando
 *      para outro lugar (evita uma segunda camada de confusão de diretório).
 */
import { existsSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';

const REAL_STATE_DIR = resolve('.wrangler/state');
const ISOLATED_DIR = resolve('.testing/isolated-wrangler-state');

function assertSafeTarget() {
  if (ISOLATED_DIR === REAL_STATE_DIR) {
    console.error('Recusado: o diretório isolado não pode ser o mesmo do banco real.');
    process.exit(1);
  }
  if (!ISOLATED_DIR.includes(resolve('.testing'))) {
    console.error('Recusado: o diretório isolado precisa estar dentro de .testing/.');
    process.exit(1);
  }
  const envDir = process.env.ISOLATED_TEST_DB_DIR;
  if (envDir && resolve(envDir) !== ISOLATED_DIR) {
    console.error(
      `Recusado: ISOLATED_TEST_DB_DIR ("${envDir}") não corresponde ao diretório isolado esperado ("${ISOLATED_DIR}").`
    );
    process.exit(1);
  }
  if (process.argv.includes('--remote')) {
    console.error('Recusado: este script nunca opera sobre o banco remoto.');
    process.exit(1);
  }
}

function init() {
  assertSafeTarget();
  if (existsSync(ISOLATED_DIR)) rmSync(ISOLATED_DIR, { recursive: true, force: true });
  mkdirSync(ISOLATED_DIR, { recursive: true });
  if (existsSync(REAL_STATE_DIR)) {
    cpSync(REAL_STATE_DIR, ISOLATED_DIR, { recursive: true });
    console.log(`Cópia isolada criada em: ${ISOLATED_DIR}`);
  } else {
    console.log(
      `Aviso: ${REAL_STATE_DIR} não existe ainda (nenhum "npm run dev" rodou antes) — diretório isolado criado vazio.`
    );
  }
  console.log('Para usar: npm run dev:isolated (porta 4322)');
}

function discard() {
  assertSafeTarget();
  if (!existsSync(ISOLATED_DIR)) {
    console.log('Nada para descartar — diretório isolado não existe.');
    return;
  }
  rmSync(ISOLATED_DIR, { recursive: true, force: true });
  console.log(`Descartado: ${ISOLATED_DIR}`);
  console.log(`O banco real (${REAL_STATE_DIR}) não foi tocado.`);
}

const cmd = process.argv[2];
if (cmd === 'init') init();
else if (cmd === 'discard') discard();
else {
  console.error('Uso: node scripts/isolated-test-db.mjs init|discard');
  process.exit(1);
}
