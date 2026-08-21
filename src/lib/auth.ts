/**
 * Autenticação — hash de senha e sessões.
 *
 * Usa exclusivamente Web Crypto (SubtleCrypto), nativo no runtime de
 * Cloudflare Workers — sem dependência de bibliotecas Node como bcrypt, que
 * não rodam em Workers. PBKDF2-SHA256 com 100.000 iterações e salt aleatório
 * por usuário (recomendação OWASP para PBKDF2).
 */

const PBKDF2_ITERATIONS = 100_000;
const SESSION_DURATION_DAYS = 7;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromHex(saltHex),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomHex(16);
  const hash = await pbkdf2(password, salt);
  return { hash, salt };
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const computed = await pbkdf2(password, salt);
  // comparação em tempo constante
  if (computed.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}

export function newSessionId(): string {
  return randomHex(32);
}

export function sessionExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DURATION_DAYS);
  return d.toISOString();
}

export const SESSION_COOKIE = 'essencial_session';
export const SESSION_MAX_AGE = SESSION_DURATION_DAYS * 24 * 60 * 60;
