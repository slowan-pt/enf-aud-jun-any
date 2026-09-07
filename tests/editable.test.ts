/**
 * O editor visual escreve no conteúdo da página por caminho textual. Estes
 * testes cobrem o contrato dessas funções e, principalmente, o que elas
 * precisam RECUSAR — é a fronteira entre o navegador e o que vai para o banco.
 */
import { describe, it, expect } from 'vitest';
import {
  getByPath,
  setByPath,
  reorderAtPath,
  duplicateAtPath,
  removeAtPath,
} from '../src/lib/editable';

function content() {
  return {
    hero: {
      title: 'Título',
      pillars: ['um', 'dois', 'três'],
      cta: { label: 'Clique', href: '/servicos' },
    },
    benefits: {
      items: [
        { title: 'A', text: 'texto A', icon: 'heart' },
        { title: 'B', text: 'texto B', icon: 'shield' },
      ],
    },
    count: 3,
  };
}

describe('getByPath', () => {
  it('lê valor em objeto aninhado', () => {
    expect(getByPath(content(), 'hero.cta.label')).toBe('Clique');
  });

  it('lê item de array por índice', () => {
    expect(getByPath(content(), 'hero.pillars.1')).toBe('dois');
    expect(getByPath(content(), 'benefits.items.0.icon')).toBe('heart');
  });

  it('devolve undefined para caminho inexistente', () => {
    expect(getByPath(content(), 'hero.naoExiste')).toBeUndefined();
    expect(getByPath(content(), 'hero.cta.label.demais')).toBeUndefined();
  });
});

describe('setByPath', () => {
  it('substitui texto existente', () => {
    const data = content();
    expect(setByPath(data, 'hero.cta.label', 'Novo')).toBe(true);
    expect(data.hero.cta.label).toBe('Novo');
  });

  it('substitui item de array de strings', () => {
    const data = content();
    expect(setByPath(data, 'hero.pillars.2', 'TRÊS')).toBe(true);
    expect(data.hero.pillars).toEqual(['um', 'dois', 'TRÊS']);
  });

  it('recusa criar chave nova', () => {
    const data = content();
    expect(setByPath(data, 'hero.subtitulo', 'x')).toBe(false);
    expect('subtitulo' in data.hero).toBe(false);
  });

  it('recusa sobrescrever valor que não é texto', () => {
    const data = content();
    expect(setByPath(data, 'count', '9')).toBe(false);
    expect(setByPath(data, 'hero.cta', 'x')).toBe(false);
    expect(data.count).toBe(3);
  });

  it('recusa índice fora do array', () => {
    const data = content();
    expect(setByPath(data, 'hero.pillars.9', 'x')).toBe(false);
    expect(data.hero.pillars).toHaveLength(3);
  });

  it('recusa poluição de protótipo', () => {
    const data = content();
    expect(setByPath(data, '__proto__.poluido', 'sim')).toBe(false);
    expect(setByPath(data, 'hero.constructor.prototype.x', 'sim')).toBe(false);
    expect(({} as Record<string, unknown>).poluido).toBeUndefined();
  });

  it('recusa caminho vazio ou malformado', () => {
    const data = content();
    expect(setByPath(data, '', 'x')).toBe(false);
    expect(setByPath(data, 'hero..title', 'x')).toBe(false);
  });
});

describe('reorderAtPath', () => {
  it('move item para frente e para trás', () => {
    const data = content();
    expect(reorderAtPath(data, 'hero.pillars', 0, 2)).toBe(true);
    expect(data.hero.pillars).toEqual(['dois', 'três', 'um']);

    expect(reorderAtPath(data, 'hero.pillars', 2, 0)).toBe(true);
    expect(data.hero.pillars).toEqual(['um', 'dois', 'três']);
  });

  it('recusa índices inválidos e caminho que não é lista', () => {
    const data = content();
    expect(reorderAtPath(data, 'hero.pillars', 0, 5)).toBe(false);
    expect(reorderAtPath(data, 'hero.pillars', -1, 0)).toBe(false);
    expect(reorderAtPath(data, 'hero.title', 0, 1)).toBe(false);
    expect(data.hero.pillars).toEqual(['um', 'dois', 'três']);
  });
});

describe('duplicateAtPath', () => {
  it('insere a cópia logo depois do original', () => {
    const data = content();
    expect(duplicateAtPath(data, 'benefits.items', 0)).toBe(true);
    expect(data.benefits.items).toHaveLength(3);
    expect(data.benefits.items[1]).toEqual(data.benefits.items[0]);
  });

  it('copia em profundidade — editar a cópia não altera o original', () => {
    const data = content();
    duplicateAtPath(data, 'benefits.items', 0);
    data.benefits.items[1]!.title = 'Alterado';
    expect(data.benefits.items[0]!.title).toBe('A');
  });
});

describe('removeAtPath', () => {
  it('remove o item indicado', () => {
    const data = content();
    expect(removeAtPath(data, 'hero.pillars', 1)).toBe(true);
    expect(data.hero.pillars).toEqual(['um', 'três']);
  });

  it('nunca esvazia a lista por completo', () => {
    const data = content();
    removeAtPath(data, 'hero.pillars', 0);
    removeAtPath(data, 'hero.pillars', 0);
    expect(data.hero.pillars).toHaveLength(1);
    expect(removeAtPath(data, 'hero.pillars', 0)).toBe(false);
    expect(data.hero.pillars).toHaveLength(1);
  });
});
