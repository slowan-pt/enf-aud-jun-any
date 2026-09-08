/**
 * Validação de URLs vindas do banco.
 *
 * O conteúdo da Home é editável pelo painel e volta para atributos `href`,
 * `src` e para dentro de uma folha de estilo. A checagem é feita na hora de
 * renderizar de propósito: é o único ponto que não dá para contornar,
 * independentemente de como o dado entrou no banco.
 *
 * Módulo sem dependências para poder ser testado fora do runtime do Worker.
 */

/** Caminho servido por nós ou URL https. Nunca `javascript:` nem `data:`. */
export function safeMediaUrl(value: string): string {
  const url = String(value ?? '').trim();
  if (!url) return '';
  // Caminho interno (/media/..., /images/...). O `(?!\/)` barra `//host`, que
  // seria protocolo relativo e apontaria para fora do site.
  if (/^\/(?!\/)[\w\-./]*$/.test(url) && !url.includes('..')) return url;
  if (/^https:\/\/[\w.-]+(:\d+)?(\/[\w\-./%?=&+~@]*)?$/.test(url)) return url;
  return '';
}

/** Slug de URL: minúsculas, sem acento, só letras/números separados por hífen. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Destino de link. Aceita caminho interno, âncora, https, e-mail e telefone;
 * recusa `javascript:`, `data:` e qualquer outro esquema.
 */
export function safeHref(value: string): string {
  const href = String(value ?? '').trim();
  if (!href) return '';
  if (/^\/(?!\/)[\w\-./#?=&%+~@]*$/.test(href) && !href.includes('..')) return href;
  if (/^#[\w-]+$/.test(href)) return href;
  if (/^https:\/\/[\w.-]+(:\d+)?(\/[\w\-./#?=&%+~@]*)?$/.test(href)) return href;
  if (/^mailto:[^\s<>"']+@[\w.-]+$/.test(href)) return href;
  if (/^tel:\+?[\d\s()-]+$/.test(href)) return href;
  return '';
}
