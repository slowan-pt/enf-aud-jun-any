/**
 * Leitura e escrita por caminho dentro do JSON de conteúdo de uma página.
 *
 * O editor visual identifica cada elemento da página por um caminho textual
 * (`hero.title`, `benefits.items.2.text`). Estas funções traduzem esse caminho
 * para o objeto guardado em `pages.sections_json`.
 *
 * Regra de segurança: só é possível escrever onde já existe um valor primitivo.
 * O editor nunca cria chaves novas nem troca o formato do conteúdo, então um
 * cliente adulterado não consegue injetar estrutura arbitrária no banco.
 */

const BLOCKED_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

type Container = Record<string, unknown> | unknown[];

function isContainer(value: unknown): value is Container {
  return typeof value === 'object' && value !== null;
}

function readSegment(container: Container, segment: string): unknown {
  if (Array.isArray(container)) {
    const index = Number(segment);
    return Number.isInteger(index) ? container[index] : undefined;
  }
  return container[segment];
}

/** Percorre o caminho e devolve o container do último segmento (ou null). */
function resolveParent(root: unknown, path: string): { parent: Container; key: string } | null {
  const segments = path.split('.');
  if (segments.length === 0 || segments.some((s) => !s || BLOCKED_SEGMENTS.has(s))) {
    return null;
  }

  let current: unknown = root;
  for (const segment of segments.slice(0, -1)) {
    if (!isContainer(current)) return null;
    current = readSegment(current, segment);
  }

  if (!isContainer(current)) return null;
  return { parent: current, key: segments[segments.length - 1]! };
}

export function getByPath(root: unknown, path: string): unknown {
  const resolved = resolveParent(root, path);
  if (!resolved) return undefined;
  return readSegment(resolved.parent, resolved.key);
}

/**
 * Grava `value` em `path`. Só aceita substituir uma string por outra string —
 * é o que o editor visual precisa (textos, URLs de mídia, nomes de ícone, cores)
 * e o que mantém o formato do conteúdo estável.
 */
export function setByPath(root: unknown, path: string, value: string): boolean {
  const resolved = resolveParent(root, path);
  if (!resolved) return false;

  const current = readSegment(resolved.parent, resolved.key);
  if (typeof current !== 'string') return false;

  if (Array.isArray(resolved.parent)) {
    const index = Number(resolved.key);
    if (!Number.isInteger(index) || index < 0 || index >= resolved.parent.length) return false;
    resolved.parent[index] = value;
    return true;
  }

  if (!Object.prototype.hasOwnProperty.call(resolved.parent, resolved.key)) return false;
  resolved.parent[resolved.key] = value;
  return true;
}

/** Move um item de posição dentro de um array existente (arrastar para reordenar). */
export function reorderAtPath(root: unknown, path: string, from: number, to: number): boolean {
  const list = getByPath(root, path);
  if (!Array.isArray(list)) return false;
  if (!Number.isInteger(from) || !Number.isInteger(to)) return false;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return false;

  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  return true;
}

/** Duplica um item de um array, inserindo a cópia logo depois do original. */
export function duplicateAtPath(root: unknown, path: string, index: number): boolean {
  const list = getByPath(root, path);
  if (!Array.isArray(list)) return false;
  if (!Number.isInteger(index) || index < 0 || index >= list.length) return false;

  list.splice(index + 1, 0, structuredClone(list[index]));
  return true;
}

/** Remove um item de um array, desde que sobre pelo menos um. */
export function removeAtPath(root: unknown, path: string, index: number): boolean {
  const list = getByPath(root, path);
  if (!Array.isArray(list) || list.length <= 1) return false;
  if (!Number.isInteger(index) || index < 0 || index >= list.length) return false;

  list.splice(index, 1);
  return true;
}
