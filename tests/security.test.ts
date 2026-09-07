/**
 * O conteúdo da Home é editável pelo painel e volta do banco direto para
 * atributos `href`, `src` e para dentro de uma folha de estilo. Estes testes
 * fixam o comportamento dos validadores que ficam nesse caminho.
 *
 * A validação é feita na hora de renderizar de propósito: é o único ponto que
 * não dá para contornar, independentemente de como o dado entrou no banco.
 */
import { describe, it, expect } from 'vitest';
import { safeHref, safeMediaUrl } from '../src/lib/urls';
import { iconPaths } from '../src/data/icons';

describe('safeHref', () => {
  it('aceita destino interno, https, e-mail e telefone', () => {
    expect(safeHref('/servicos')).toBe('/servicos');
    expect(safeHref('/conteudos?pagina=2')).toBe('/conteudos?pagina=2');
    expect(safeHref('#contato')).toBe('#contato');
    expect(safeHref('https://wa.me/5561982444083')).toBe('https://wa.me/5561982444083');
    expect(safeHref('mailto:contato@essencial.test')).toBe('mailto:contato@essencial.test');
    expect(safeHref('tel:+5561982444083')).toBe('tel:+5561982444083');
  });

  it('recusa javascript:', () => {
    expect(safeHref('javascript:alert(1)')).toBe('');
    expect(safeHref('JavaScript:alert(1)')).toBe('');
    expect(safeHref('  javascript:alert(1)  ')).toBe('');
  });

  it('recusa data: e outros esquemas', () => {
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(safeHref('vbscript:msgbox(1)')).toBe('');
    expect(safeHref('file:///etc/passwd')).toBe('');
  });

  it('recusa http sem TLS e URL de protocolo relativo', () => {
    expect(safeHref('http://inseguro.test')).toBe('');
    expect(safeHref('//outro-dominio.test/x')).toBe('');
  });

  it('recusa caminho que tenta sair do site', () => {
    expect(safeHref('/../../etc/passwd')).toBe('');
  });

  it('valor vazio ou ausente vira string vazia, nunca undefined no atributo', () => {
    expect(safeHref('')).toBe('');
    expect(safeHref(undefined as unknown as string)).toBe('');
  });
});

describe('safeMediaUrl', () => {
  it('aceita caminho servido por nós', () => {
    expect(safeMediaUrl('/media/foto.jpg')).toBe('/media/foto.jpg');
    expect(safeMediaUrl('/images/hero-essencial.svg')).toBe('/images/hero-essencial.svg');
  });

  it('aceita https externo', () => {
    expect(safeMediaUrl('https://cdn.test/a.png')).toBe('https://cdn.test/a.png');
  });

  it('recusa javascript: e data:', () => {
    expect(safeMediaUrl('javascript:alert(1)')).toBe('');
    expect(safeMediaUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe('');
  });

  it('recusa caminho com aspas, que escaparia do atributo ou do url() do CSS', () => {
    expect(safeMediaUrl('/media/a".jpg')).toBe('');
    expect(safeMediaUrl("/media/a'.jpg")).toBe('');
    expect(safeMediaUrl('/media/a).jpg')).toBe('');
  });

  it('recusa travessia de diretório', () => {
    expect(safeMediaUrl('/media/../../secret')).toBe('');
  });

  it('recusa protocolo relativo', () => {
    expect(safeMediaUrl('//evil.test/x.png')).toBe('');
  });
});

describe('nomes de ícone', () => {
  it('a biblioteca não expõe chaves herdadas do protótipo', () => {
    // `Icon.astro` decide com hasOwnProperty; um nome como "constructor" não
    // pode ser confundido com um ícone existente.
    expect(Object.prototype.hasOwnProperty.call(iconPaths, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(iconPaths, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(iconPaths, 'toString')).toBe(false);
  });

  it('os ícones usados na Home existem na biblioteca', () => {
    for (const name of ['heart', 'shield-check', 'handshake', 'target', 'eye', 'check']) {
      expect(Object.prototype.hasOwnProperty.call(iconPaths, name)).toBe(true);
    }
  });

  it('nenhum ícone da biblioteca contém script ou manipulador de evento', () => {
    for (const [name, markup] of Object.entries(iconPaths)) {
      expect(markup, name).not.toMatch(/<script|onload=|onerror=|javascript:/i);
    }
  });
});
