#!/usr/bin/env node
/**
 * Copia as bibliotecas de terceiros usadas apenas pelo editor visual para
 * `public/vendor/`.
 *
 * Por que não importar direto no bundle do Astro: o runtime do editor roda
 * dentro do iframe da página pública e só é carregado quando `?__edit=1` está
 * presente. Um `<script>` processado pelo Astro entraria no bundle de toda
 * visita à Home — 245KB para quem só quer ler o site. Servindo de `public/`,
 * o arquivo só é baixado por quem abre o editor.
 *
 * Roda automaticamente em `predev` e `prebuild`.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const assets = [
  ['node_modules/moveable/dist/moveable.min.js', 'public/vendor/moveable.min.js'],
  // Só carregado por /admin/organogramas/[id] (editor de organogramas/
  // fluxogramas, item 8 do escopo) — nunca pelo site público nem pelo
  // restante do painel.
  ['node_modules/fabric/dist/index.min.js', 'public/vendor/fabric.min.js'],
  // Só carregado pela página /portfolio (revista com páginas que viram).
  ['node_modules/page-flip/dist/js/page-flip.browser.js', 'public/vendor/page-flip.browser.js'],
  // Só carregado por /admin/portfolio: converte o PDF enviado em imagens no navegador.
  ['node_modules/pdfjs-dist/legacy/build/pdf.min.mjs', 'public/vendor/pdf.min.mjs'],
  ['node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'public/vendor/pdf.worker.min.mjs'],
];

for (const [from, to] of assets) {
  const target = resolve(root, to);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, from), target);
  console.log(`vendor: ${to}`);
}
