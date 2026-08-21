#!/usr/bin/env node
/**
 * Gera o SQL de criação/atualização de um usuário do CMS, com a senha já
 * transformada em hash PBKDF2 (nunca gravamos senha em texto simples).
 *
 * Uso:
 *   node scripts/create-user.mjs "Nome Sobrenome" email@dominio.com "SenhaForte123!" admin
 *
 * O comando IMPRIME o SQL — ele não toca no banco sozinho. Para aplicar:
 *
 *   Local (dev):
 *     node scripts/create-user.mjs ... > /tmp/user.sql
 *     npx wrangler d1 execute essencial-saude-db --local --file=/tmp/user.sql
 *
 *   Produção (após `wrangler d1 create` real):
 *     npx wrangler d1 execute essencial-saude-db --remote --file=/tmp/user.sql
 */

const PBKDF2_ITERATIONS = 100_000;

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomHex(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

async function pbkdf2(password, saltHex) {
  const enc = new TextEncoder();
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g).map((b) => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return toHex(bits);
}

function sqlEscape(value) {
  return value.replace(/'/g, "''");
}

const [, , name, email, password, role = 'admin'] = process.argv;

if (!name || !email || !password) {
  console.error('Uso: node scripts/create-user.mjs "Nome" email@dominio.com "senha" [admin|editor]');
  process.exit(1);
}

if (!['admin', 'editor'].includes(role)) {
  console.error('Papel inválido. Use "admin" ou "editor".');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Use uma senha com pelo menos 8 caracteres.');
  process.exit(1);
}

const salt = randomHex(16);
const hash = await pbkdf2(password, salt);

const sql = `INSERT INTO users (name, email, password_hash, password_salt, role, status)
VALUES ('${sqlEscape(name)}', '${sqlEscape(email.toLowerCase())}', '${hash}', '${salt}', '${role}', 'active')
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt,
  role = excluded.role,
  status = 'active',
  updated_at = datetime('now');
`;

console.log(sql);
