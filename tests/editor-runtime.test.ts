import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const runtime = readFileSync(new URL('../public/editor-runtime.js', import.meta.url), 'utf8');

describe('editor visual runtime', () => {
  it('usa a moldura do Moveable como area de arraste para imagens e videos', () => {
    expect(runtime).toContain(
      "var mediaDragArea = kindOf(element) === 'video' || kindOf(element) === 'image'"
    );
    expect(runtime).toContain('dragArea: mediaDragArea');
    expect(runtime).toContain('passDragArea: false');
  });

  it('mantem as setas ativas quando o foco esta no painel do editor', () => {
    expect(runtime).toContain("parentWindow.document.addEventListener('keydown'");
    expect(runtime).toContain('nudgeSelected(delta[0], delta[1])');
    expect(runtime).toContain('var step = event.shiftKey ? 10 : 1');
  });
});
