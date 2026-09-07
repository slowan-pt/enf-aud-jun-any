/**
 * O upload é autorizado pelos bytes do arquivo, não pelo `file.type` nem pela
 * extensão — os dois vêm do navegador. Estes testes fixam esse contrato.
 */
import { describe, it, expect } from 'vitest';
import { sniffUpload, checkUpload, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '../src/lib/uploads';

/** Monta um cabeçalho de arquivo a partir de bytes e/ou texto. */
function head(...parts: Array<number[] | string>): Uint8Array {
  const bytes: number[] = [];
  for (const part of parts) {
    if (typeof part === 'string') bytes.push(...[...part].map((c) => c.charCodeAt(0)));
    else bytes.push(...part);
  }
  while (bytes.length < 32) bytes.push(0);
  return new Uint8Array(bytes);
}

const JPEG = head([0xff, 0xd8, 0xff, 0xe0]);
const PNG = head([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = head('RIFF', [0, 0, 0, 0], 'WEBP');
const WEBM = head([0x1a, 0x45, 0xdf, 0xa3]);
const MP4 = head([0, 0, 0, 0x20], 'ftyp', 'isom');

describe('sniffUpload', () => {
  it('reconhece os formatos aceitos pela assinatura', () => {
    expect(sniffUpload(JPEG)?.mimeType).toBe('image/jpeg');
    expect(sniffUpload(PNG)?.mimeType).toBe('image/png');
    expect(sniffUpload(WEBP)?.mimeType).toBe('image/webp');
    expect(sniffUpload(WEBM)?.mimeType).toBe('video/webm');
    expect(sniffUpload(MP4)?.mimeType).toBe('video/mp4');
  });

  it('classifica imagem e vídeo com os limites certos', () => {
    expect(sniffUpload(PNG)?.kind).toBe('image');
    expect(sniffUpload(PNG)?.maxBytes).toBe(MAX_IMAGE_BYTES);
    expect(sniffUpload(MP4)?.kind).toBe('video');
    expect(sniffUpload(MP4)?.maxBytes).toBe(MAX_VIDEO_BYTES);
  });

  it('a extensão gravada vem do formato, não do nome enviado', () => {
    expect(sniffUpload(PNG)?.extension).toBe('png');
    expect(sniffUpload(WEBM)?.extension).toBe('webm');
  });

  it('não reconhece SVG, HTML nem arquivo arbitrário', () => {
    expect(sniffUpload(head('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffUpload(head('<!DOCTYPE html>'))).toBeNull();
    expect(sniffUpload(head('MZ'))).toBeNull(); // executável Windows
    expect(sniffUpload(head([]))).toBeNull();
  });

  it('RIFF que não é WEBP não passa como imagem', () => {
    expect(sniffUpload(head('RIFF', [0, 0, 0, 0], 'WAVE'))).toBeNull();
  });
});

describe('checkUpload', () => {
  it('aceita arquivo reconhecido dentro do limite', () => {
    const result = checkUpload(PNG, 1024, 'image/png');
    expect(result.ok).toBe(true);
    expect(result.format?.mimeType).toBe('image/png');
  });

  it('IGNORA o tipo declarado: bytes de PNG com type de vídeo continuam PNG', () => {
    const result = checkUpload(PNG, 1024, 'video/mp4');
    expect(result.ok).toBe(true);
    expect(result.format?.mimeType).toBe('image/png');
    expect(result.format?.maxBytes).toBe(MAX_IMAGE_BYTES);
  });

  it('declarar image/png não salva um arquivo que não é imagem', () => {
    const result = checkUpload(head('<!DOCTYPE html><script>'), 500, 'image/png');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/não reconhecido/i);
  });

  it('recusa SVG com mensagem própria, mesmo declarado como imagem', () => {
    const comXml = checkUpload(head('<?xml version="1.0"?><svg>'), 500, 'image/svg+xml');
    expect(comXml.ok).toBe(false);
    expect(comXml.error).toMatch(/SVG/);

    const semXml = checkUpload(head('<svg onload="alert(1)">'), 500, 'image/svg+xml');
    expect(semXml.ok).toBe(false);
    expect(semXml.error).toMatch(/SVG/);
  });

  it('impõe o limite de tamanho do formato reconhecido', () => {
    expect(checkUpload(PNG, MAX_IMAGE_BYTES + 1).ok).toBe(false);
    expect(checkUpload(PNG, MAX_IMAGE_BYTES).ok).toBe(true);
    // Vídeo tem limite maior — um PNG grande não se beneficia dele.
    expect(checkUpload(MP4, MAX_IMAGE_BYTES + 1).ok).toBe(true);
    expect(checkUpload(MP4, MAX_VIDEO_BYTES + 1).ok).toBe(false);
  });

  it('recusa arquivo vazio', () => {
    expect(checkUpload(PNG, 0).ok).toBe(false);
  });
});
