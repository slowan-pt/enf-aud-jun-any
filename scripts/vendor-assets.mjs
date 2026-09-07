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
];

for (const [from, to] of assets) {
  const target = resolve(root, to);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, from), target);
  console.log(`vendor: ${to}`);
}
