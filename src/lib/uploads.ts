/**
 * Identificação de arquivo enviado pelo conteúdo, não pelo que o cliente diz.
 *
 * `file.type` e a extensão vêm do navegador e podem ser qualquer coisa. Aqui os
 * primeiros bytes são conferidos contra a assinatura de cada formato aceito, e
 * é esse resultado que decide se o upload passa e qual `Content-Type` fica
 * gravado — nada do que o cliente afirmou é reaproveitado.
 *
 * Módulo sem dependências para poder ser testado fora do runtime do Worker.
 */

export const SNIFF_BYTES = 32;

export type UploadKind = 'image' | 'video';

export interface UploadFormat {
  mimeType: string;
  kind: UploadKind;
  extension: string;
  maxBytes: number;
}

const MB = 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * MB;
// Workers aceita até 100 MB por requisição; fica abaixo para sobrar margem do
// overhead do multipart/form-data.
export const MAX_VIDEO_BYTES = 90 * MB;

const IMAGE = (mimeType: string, extension: string): UploadFormat => ({
  mimeType,
  kind: 'image',
  extension,
  maxBytes: MAX_IMAGE_BYTES,
});

const VIDEO = (mimeType: string, extension: string): UploadFormat => ({
  mimeType,
  kind: 'video',
  extension,
  maxBytes: MAX_VIDEO_BYTES,
});

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/**
 * Devolve o formato reconhecido pelos primeiros bytes, ou null.
 *
 * SVG não entra de propósito: é XML executável, e reconhecê-lo por assinatura
 * não diz nada sobre o que há dentro. Enquanto não houver sanitização de
 * verdade, o upload é recusado — ver ALLOWED_FORMATS.
 */
export function sniffUpload(bytes: Uint8Array): UploadFormat | null {
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return IMAGE('image/jpeg', 'jpg');

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return IMAGE('image/png', 'png');
  }

  // WebP: "RIFF" …tamanho… "WEBP"
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return IMAGE('image/webp', 'webp');
  }

  // WebM (contêiner Matroska): 1A 45 DF A3
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return VIDEO('video/webm', 'webm');

  // MP4 e derivados: caixa "ftyp" no offset 4.
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);
    // "qt  " é QuickTime, que compartilha a estrutura mas não é MP4.
    if (brand.trim() && brand !== 'qt') return VIDEO('video/mp4', 'mp4');
  }

  return null;
}

/** Formatos que o sistema aceita hoje. */
export const ALLOWED_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
];

export interface UploadCheck {
  ok: boolean;
  format?: UploadFormat;
  error?: string;
}

/**
 * Decide se o arquivo pode ser gravado. `declaredType` entra só para explicar a
 * recusa numa mensagem melhor — nunca para autorizar.
 */
export function checkUpload(
  bytes: Uint8Array,
  sizeBytes: number,
  declaredType = ''
): UploadCheck {
  const format = sniffUpload(bytes);

  if (!format) {
    if (declaredType === 'image/svg+xml' || ascii(bytes, 0, 5).toLowerCase() === '<?xml') {
      return {
        ok: false,
        error:
          'SVG não é aceito no envio: é um formato executável e ainda não há sanitização. Use PNG, JPG ou WebP.',
      };
    }
    return {
      ok: false,
      error:
        'Formato não reconhecido pelo conteúdo do arquivo. Use JPG, PNG, WebP, MP4 ou WebM.',
    };
  }

  if (sizeBytes > format.maxBytes) {
    const limit = format.kind === 'video' ? '90 MB' : '5 MB';
    return { ok: false, error: `Arquivo maior que ${limit}.`, format };
  }

  if (sizeBytes <= 0) {
    return { ok: false, error: 'Arquivo vazio.', format };
  }

  return { ok: true, format };
}
