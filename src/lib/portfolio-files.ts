/**
 * Arquivos do Portfólio (revista + PDF de download).
 *
 * Padrão: as imagens em /portfolio/pagina-N.webp (arquivos do site) e o PDF
 * no R2 em `PORTFOLIO_PDF_KEY`. Quando o admin envia um PDF novo, o navegador
 * dele converte as páginas em imagens e tudo vai para o R2 numa pasta de
 * VERSÃO (`portfolio/v<versão>/`). A configuração só aponta para a versão
 * nova depois que todos os arquivos chegaram — até lá o site segue como está.
 */
import { PORTFOLIO_PDF_KEY } from './portfolio';

export interface PortfolioFilesSettings {
  /** Vazio = arquivos originais do site. */
  version: string;
  pageCount: number;
  /** largura / altura de cada página. */
  ratio: number;
}

export const DEFAULT_PORTFOLIO_FILES: PortfolioFilesSettings = {
  version: '',
  pageCount: 7,
  ratio: 595 / 842,
};

export interface PortfolioHero {
  eyebrow: string;
  title: string;
  lead: string;
}

export const DEFAULT_PORTFOLIO_HERO: PortfolioHero = {
  eyebrow: 'Institucional',
  title: 'Portfólio',
  lead: 'Conheça a Essencial Saúde Auditoria: o que fazemos, em quais segmentos atuamos e como trabalhamos.',
};

/** Texto vazio volta ao padrão: o topo da página nunca fica sem título. */
export function normalizePortfolioHero(raw: unknown): PortfolioHero {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pick = (key: keyof PortfolioHero, max: number) => {
    const text = typeof v[key] === 'string' ? (v[key] as string).trim().slice(0, max) : '';
    return text || DEFAULT_PORTFOLIO_HERO[key];
  };
  return { eyebrow: pick('eyebrow', 80), title: pick('title', 120), lead: pick('lead', 400) };
}

export const MAX_PAGES = 60;
export const VERSION_RE = /^[a-z0-9]{6,20}$/;
/** Imagens públicas da revista (o PDF nunca é público). */
export const IMAGE_NAME_RE = /^(pagina|zoom)-([1-9][0-9]?)\.webp$/;
export const PDF_NAME = 'portfolio.pdf';

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_PDF_BYTES = 40 * 1024 * 1024;

export function normalizePortfolioFiles(raw: unknown): PortfolioFilesSettings {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const version = typeof v.version === 'string' && VERSION_RE.test(v.version) ? v.version : '';
  if (!version) return { ...DEFAULT_PORTFOLIO_FILES };
  const pageCount = Number(v.pageCount);
  const ratio = Number(v.ratio);
  return {
    version,
    pageCount:
      Number.isInteger(pageCount) && pageCount >= 1 && pageCount <= MAX_PAGES
        ? pageCount
        : DEFAULT_PORTFOLIO_FILES.pageCount,
    ratio: Number.isFinite(ratio) && ratio >= 0.3 && ratio <= 3 ? ratio : DEFAULT_PORTFOLIO_FILES.ratio,
  };
}

export const versionKey = (version: string, name: string) => `portfolio/v${version}/${name}`;

export function pdfKeyFor(files: PortfolioFilesSettings): string {
  return files.version ? versionKey(files.version, PDF_NAME) : PORTFOLIO_PDF_KEY;
}

export function pageImageUrls(files: PortfolioFilesSettings): string[] {
  return Array.from({ length: files.pageCount }, (_, i) =>
    files.version
      ? `/portfolio/img/${files.version}/pagina-${i + 1}.webp`
      : `/portfolio/pagina-${i + 1}.webp`
  );
}

/** Confere os primeiros bytes — o nome/tipo que o navegador declara não vale. */
export function sniffKind(head: Uint8Array): 'webp' | 'pdf' | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (head.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  if (head.length >= 5 && ascii(0, 5) === '%PDF-') return 'pdf';
  return null;
}

export function newVersion(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
