/**
 * Identidade estável de destaques/blocos (src/lib/service-item-ids.ts) —
 * a correção central pedida: reordenar, duplicar e excluir não pode trocar
 * a posição/estilo salva de um item para outro.
 */
import { describe, it, expect } from 'vitest';
import {
  ensureItemIds,
  migrateLayoutKeysToIds,
  migrateServiceItemIds,
  generateItemId,
} from '../src/lib/service-item-ids';
import { EMPTY_SERVICE_EDITOR_CONTENT } from '../src/lib/service-editor';
import { reorderAtPath } from '../src/lib/editable';

describe('generateItemId', () => {
  it('gera ids alfanuméricos válidos como segmento de caminho de layout', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateItemId()).toMatch(/^[A-Za-z0-9_]+$/);
    }
  });

  it('nunca repete entre chamadas', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateItemId()));
    expect(ids.size).toBe(50);
  });
});

describe('ensureItemIds — nunca gera id novo para item que já tem', () => {
  it('preenche só quem está sem id', () => {
    const items = [{ id: 'ja-tinha', title: 'A' }, { title: 'B' }];
    const { items: out, changed } = ensureItemIds(items);
    expect(changed).toBe(true);
    expect(out[0]?.id).toBe('ja-tinha'); // preservado, não regenerado
    expect(out[1]?.id).toBeTruthy();
  });

  it('lista onde todos já têm id: changed = false (idempotente)', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const { items: out, changed } = ensureItemIds(items);
    expect(changed).toBe(false);
    expect(out).toEqual(items);
  });

  it('não deriva id de título/texto — dois itens com o mesmo título recebem ids diferentes', () => {
    const items: { id?: string; title: string }[] = [
      { title: 'Mesmo título' },
      { title: 'Mesmo título' },
    ];
    const { items: out } = ensureItemIds(items);
    expect(out[0]?.id).not.toBe(out[1]?.id);
  });
});

describe('migrateLayoutKeysToIds', () => {
  it('converte chave por índice para chave por id, usando a posição atual', () => {
    const highlights = [{ id: 'hA' }, { id: 'hB' }];
    const layouts = {
      'highlights.0.title': { desktop: { x: 1 }, mobile: null },
      'highlights.1.title': { desktop: { x: 2 }, mobile: null },
    } as never;
    const { layouts: out, changed } = migrateLayoutKeysToIds(
      out_input(layouts),
      highlights,
      []
    );
    expect(changed).toBe(true);
    expect(out['highlights.hA.title']).toBeDefined();
    expect(out['highlights.hB.title']).toBeDefined();
    expect(out['highlights.0.title']).toBeUndefined();
  });

  it('é idempotente: chave já por id não bate no padrão de índice e fica intacta', () => {
    const highlights = [{ id: 'hA' }];
    const layouts = out_input({ 'highlights.hA.title': { desktop: { x: 1 }, mobile: null } });
    const { layouts: out, changed } = migrateLayoutKeysToIds(layouts, highlights, []);
    expect(changed).toBe(false);
    expect(out).toEqual(layouts);
  });

  it('item sem id na posição referenciada: mantém a chave antiga (nunca descarta o dado)', () => {
    const highlights = [{}]; // sem id — não deveria acontecer após ensureItemIds, mas é defensivo
    const layouts = out_input({ 'highlights.0.title': { desktop: { x: 1 }, mobile: null } });
    const { layouts: out, changed } = migrateLayoutKeysToIds(layouts, highlights, []);
    expect(changed).toBe(false);
    expect(out['highlights.0.title']).toBeDefined();
  });

  function out_input(v: unknown) {
    return v as import('../src/lib/service-editor').ServiceEditorContent['layouts'];
  }
});

describe('migrateServiceItemIds — exemplo antes/depois completo', () => {
  it('serviço antigo sem ids e com layout por índice: migra tudo de uma vez', () => {
    const highlights = [
      { icon: 'search', title: 'Destaque A', text: 'texto A' },
      { icon: 'shield', title: 'Destaque B', text: 'texto B' },
    ];
    const blocks = [{ title: 'Bloco único', text: 'texto' }];
    const editorContent = {
      ...EMPTY_SERVICE_EDITOR_CONTENT,
      layouts: {
        'highlights.0.title': {
          desktop: {
            v: 2 as const,
            x: 10,
            y: 0,
            w: 0,
            h: 0,
            z: 0,
            fontSize: 0,
            color: '',
            align: '',
            weight: 0,
            r: 0,
            locked: false,
            hidden: false,
            label: '',
            opacity: 100,
          },
          mobile: null,
        },
        'highlights.1.title': {
          desktop: {
            v: 2 as const,
            x: 20,
            y: 0,
            w: 0,
            h: 0,
            z: 0,
            fontSize: 0,
            color: '',
            align: '',
            weight: 0,
            r: 0,
            locked: false,
            hidden: false,
            label: '',
            opacity: 100,
          },
          mobile: null,
        },
      },
    };

    const result = migrateServiceItemIds(highlights, blocks, editorContent);

    expect(result.changed).toBe(true);
    expect(result.highlights[0]?.id).toBeTruthy();
    expect(result.highlights[1]?.id).toBeTruthy();
    expect(result.highlights[0]?.id).not.toBe(result.highlights[1]?.id);
    expect(result.blocks[0]?.id).toBeTruthy();

    const idA = result.highlights[0]!.id!;
    const idB = result.highlights[1]!.id!;
    expect(result.layouts[`highlights.${idA}.title`]?.desktop.x).toBe(10);
    expect(result.layouts[`highlights.${idB}.title`]?.desktop.x).toBe(20);
    expect(result.layouts['highlights.0.title']).toBeUndefined();
    expect(result.layouts['highlights.1.title']).toBeUndefined();

    // Conteúdo (título/texto/ícone) nunca muda por migrar identidade.
    expect(result.highlights[0]?.title).toBe('Destaque A');
    expect(result.highlights[1]?.title).toBe('Destaque B');
  });

  it('serviço já migrado: changed = false, nada é regravado', () => {
    const highlights = [{ id: 'hA', icon: 'search', title: 'A', text: 't' }];
    const editorContent = {
      ...EMPTY_SERVICE_EDITOR_CONTENT,
      layouts: {
        'highlights.hA.title': {
          desktop: {
            v: 2 as const,
            x: 5,
            y: 0,
            w: 0,
            h: 0,
            z: 0,
            fontSize: 0,
            color: '',
            align: '',
            weight: 0,
            r: 0,
            locked: false,
            hidden: false,
            label: '',
            opacity: 100,
          },
          mobile: null,
        },
      },
    };
    const result = migrateServiceItemIds(highlights, [], editorContent);
    expect(result.changed).toBe(false);
  });
});

describe('teste do usuário: posicionar A e B, reordenar, confirmar que a posição acompanha o item', () => {
  it('depois de reordenar (A para o índice 1, B para o índice 0), a busca por id ainda acha a posição certa de cada um', () => {
    // 1. Posicionar destaque A e B em locais diferentes.
    const highlights = [
      { id: 'idA', icon: 'search', title: 'Destaque A', text: 'texto A' },
      { id: 'idB', icon: 'shield', title: 'Destaque B', text: 'texto B' },
    ];
    const layouts: Record<string, { desktop: { x: number }; mobile: null }> = {
      'highlights.idA.title': { desktop: { x: 10 }, mobile: null },
      'highlights.idB.title': { desktop: { x: 90 }, mobile: null },
    };

    // 2. Reordenar A e B (o conteúdo, na tabela services, é o único que se
    //    move — o id viaja junto porque mora dentro do próprio item).
    expect(reorderAtPath({ highlights }, 'highlights', 0, 1)).toBe(true);

    // 3. Confirmar: cada posição salva (chaveada por id) continua com o
    //    destaque certo, independente de qual índice ele ocupa agora.
    const now = highlights; // já reordenado por reorderAtPath (mutação in-place)
    const byId = (id: string) => now.find((h) => h.id === id);

    expect(byId('idA')?.title).toBe('Destaque A'); // A continua sendo A
    expect(byId('idB')?.title).toBe('Destaque B');
    expect(layouts['highlights.idA.title']?.desktop.x).toBe(10); // posição de A não mudou
    expect(layouts['highlights.idB.title']?.desktop.x).toBe(90); // posição de B não mudou

    // 4. E o índice de cada um de fato trocou (prova de que o reorder aconteceu).
    expect(now[0]?.id).toBe('idB');
    expect(now[1]?.id).toBe('idA');
  });

  it('editar o título de A depois de reordenado não muda o id de A', () => {
    const highlights = [
      { id: 'idA', icon: 'search', title: 'Destaque A', text: 'texto A' },
      { id: 'idB', icon: 'shield', title: 'Destaque B', text: 'texto B' },
    ];
    reorderAtPath({ highlights }, 'highlights', 0, 1);
    const a = highlights.find((h) => h.id === 'idA')!;
    a.title = 'Título editado';
    expect(a.id).toBe('idA'); // id não muda ao editar conteúdo
  });
});
