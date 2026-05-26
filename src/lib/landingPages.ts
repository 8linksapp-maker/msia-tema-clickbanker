/**
 * Landing Page schema (all-blocks).
 * Toda landing é uma LISTA ORDENADA de blocos. Cada bloco tem tipo + dados.
 * 11 tipos: 7 estruturais (hero, problem, etc) + 4 modulares (text-image, gallery, stats, quote).
 */

export type BlockType =
  | 'hero'
  | 'problem'
  | 'solution'
  | 'benefits'
  | 'testimonials'
  | 'faq'
  | 'cta-final'
  | 'text-image'
  | 'gallery'
  | 'stats'
  | 'quote'
  | 'countdown';

export interface Testimonial { name: string; text: string; rating: number; avatar?: string; }
export interface FaqItem { q: string; a: string; }
export interface GalleryImage { src: string; caption?: string; }
export interface StatItem { value: string; label: string; }

// ===== Block data shapes =====
export interface HeroBlockData { headline: string; subheadline: string; image: string; cta: string; }
export interface ProblemBlockData { headline: string; items: string[]; }
export interface SolutionBlockData { headline: string; text: string; image: string; }
export interface BenefitsBlockData { headline: string; items: string[]; }
export interface TestimonialsBlockData { headline: string; items: Testimonial[]; }
export interface FaqBlockData { headline: string; items: FaqItem[]; }
export interface CtaFinalBlockData { headline: string; subtext: string; cta: string; urgency: string; }
export interface TextImageBlockData { headline: string; text: string; image: string; imagePosition: 'left' | 'right'; }
export interface GalleryBlockData { headline: string; columns: 2 | 3 | 4; images: GalleryImage[]; }
export interface StatsBlockData { headline: string; items: StatItem[]; }
export interface QuoteBlockData { text: string; author: string; role: string; }
export interface CountdownBlockData {
  targetDate: string;       // ISO datetime "2026-12-31T23:59:00"
  headline: string;         // "Oferta termina em"
  layout: 'box' | 'banner'; // box = card centralizado | banner = barra horizontal
  expiredMessage: string;   // "Oferta encerrada"
}

export type BlockData =
  | HeroBlockData | ProblemBlockData | SolutionBlockData | BenefitsBlockData
  | TestimonialsBlockData | FaqBlockData | CtaFinalBlockData
  | TextImageBlockData | GalleryBlockData | StatsBlockData | QuoteBlockData
  | CountdownBlockData;

/** Estilo visual por bloco — controla background + contraste do texto. */
export type BlockBackground = 'default' | 'muted' | 'dark' | 'primary' | string; // string = hex custom

export interface BlockStyle {
  background?: BlockBackground;
  textColor?: string;  // hex pra sobrescrever auto-contraste (opcional)
}

export interface Block {
  id: string;
  type: BlockType;
  data: BlockData;
  style?: BlockStyle;
}

/** Helper: dado um hex, decide se texto deve ser light. */
export function isHexDark(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 140;
}

export const BG_PRESETS: { value: 'default' | 'muted' | 'dark' | 'primary'; label: string; preview: string }[] = [
  { value: 'default', label: 'Padrão (claro)', preview: '#fcf9f4' },
  { value: 'muted',   label: 'Cinza claro',    preview: '#f4ede2' },
  { value: 'dark',    label: 'Escuro (ink)',   preview: '#261f16' },
  { value: 'primary', label: 'Cor primária',   preview: '#a3592d' },
];

export interface LandingPage {
  slug: string;
  productSlug: string;
  published: boolean;
  createdAt: string;
  blocks: Block[];
  seo: { title: string; description: string };
  /** Cor primária customizada (hex). Vazio = herda do siteConfig. */
  primaryColor?: string;
  /** Família de fonte da landing (slug do FONT_OPTIONS). Vazio = padrão (Cabinet Grotesk + Switzer). */
  fontFamily?: string;
  /** Widgets globais (plugins) da landing. Cada um ativável independente. */
  widgets?: LandingWidgets;
  /** Thumbnail customizada da landing (URL ou /uploads/...). Se vazio, deriva do hero image → produto. */
  thumbnail?: string;
}

/** Resolve a thumbnail final de uma LP: custom > hero image > produto.image > null */
export function resolveLandingThumbnail(lp: LandingPage, productImage?: string): string | null {
  if (lp.thumbnail) return lp.thumbnail;
  const heroBlock = lp.blocks?.find((b) => b.type === 'hero');
  const heroImg = (heroBlock?.data as any)?.image;
  if (heroImg) return heroImg;
  if (productImage) return productImage;
  return null;
}

export interface LandingWidgets {
  promoBar?: PromoBarWidget;
  socialProof?: SocialProofWidget;
  exitPopup?: ExitPopupWidget;
}

export interface PromoBarWidget {
  enabled: boolean;
  emoji: string;
  text: string;
  ctaText: string;
  ctaLink: string;  // se vazio, usa /go/{productSlug}
  background: 'primary' | 'ink' | string;  // preset ou hex
}

export interface SocialProofItem {
  name: string;     // "Marina"
  location: string; // "SP" / "Curitiba"
  product?: string; // se vazio, usa product.name
  time: string;     // "há 3 minutos" / "agora"
}

export interface SocialProofWidget {
  enabled: boolean;
  items: SocialProofItem[];
  intervalSeconds: number;  // intervalo entre notifications
  position: 'bottom-left' | 'bottom-right';
}

export interface ExitPopupWidget {
  enabled: boolean;
  headline: string;
  subtext: string;
  ctaText: string;
  couponCode: string;  // opcional
}

/** Fontes selecionáveis pela landing. */
export interface FontOption {
  value: string;       // ex: 'boska'
  label: string;       // ex: 'Boska (serif editorial)'
  displayName: string; // nome usado no CSS font-family
  importUrl: string;   // URL do <link> pra carregar a fonte
  cssStack: string;    // fallback completo
}

export const FONT_OPTIONS: FontOption[] = [
  {
    value: '',
    label: 'Padrão do tema',
    displayName: 'Cabinet Grotesk',
    importUrl: '',
    cssStack: `'Cabinet Grotesk', 'Switzer', system-ui, -apple-system, sans-serif`,
  },
  {
    value: 'cabinet-grotesk',
    label: 'Cabinet Grotesk (industrial moderno)',
    displayName: 'Cabinet Grotesk',
    importUrl: 'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800,900&display=swap',
    cssStack: `'Cabinet Grotesk', system-ui, sans-serif`,
  },
  {
    value: 'switzer',
    label: 'Switzer (sans clean)',
    displayName: 'Switzer',
    importUrl: 'https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700,800&display=swap',
    cssStack: `'Switzer', system-ui, sans-serif`,
  },
  {
    value: 'boska',
    label: 'Boska (serif editorial)',
    displayName: 'Boska',
    importUrl: 'https://api.fontshare.com/v2/css?f[]=boska@400,500,600,700,900&display=swap',
    cssStack: `'Boska', Georgia, serif`,
  },
  {
    value: 'manrope',
    label: 'Manrope (humanist)',
    displayName: 'Manrope',
    importUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
    cssStack: `'Manrope', system-ui, sans-serif`,
  },
  {
    value: 'dm-serif',
    label: 'DM Serif Display (elegante)',
    displayName: 'DM Serif Display',
    importUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;700&display=swap',
    cssStack: `'DM Serif Display', Georgia, serif`,
  },
];

export function findFontOption(value: string | undefined): FontOption {
  return FONT_OPTIONS.find(f => f.value === value) || FONT_OPTIONS[0];
}

/** 5 presets curados do tema (OKLCH committed). */
export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Terracota',  hex: '#a3592d' },
  { name: 'Azul Tinta', hex: '#3458a2' },
  { name: 'Oliva',      hex: '#5f7436' },
  { name: 'Ocre',       hex: '#c49838' },
  { name: 'Vinho',      hex: '#8c344c' },
];

/** Converte hex pra "R G B" triplet (uso em CSS var). */
export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return '163 89 45';
  return `${parseInt(h.substring(0,2),16)} ${parseInt(h.substring(2,4),16)} ${parseInt(h.substring(4,6),16)}`;
}

// ===== Metadata por tipo (label, ícone-name pra UI, descrição) =====
export const BLOCK_META: Record<BlockType, { label: string; icon: string; desc: string; isStructural: boolean }> = {
  'hero':         { label: 'Hero',          icon: 'Rocket',      desc: 'Headline + sub + CTA + imagem', isStructural: true },
  'problem':      { label: 'Problema',      icon: 'AlertOctagon', desc: 'Lista de dores/problemas',     isStructural: true },
  'solution':     { label: 'Solução',       icon: 'Lightbulb',   desc: 'Apresenta o produto',           isStructural: true },
  'benefits':     { label: 'Benefícios',    icon: 'CheckCircle2', desc: 'Lista de benefícios',          isStructural: true },
  'testimonials': { label: 'Depoimentos',   icon: 'MessageSquareQuote', desc: '3 testimonials',         isStructural: true },
  'faq':          { label: 'FAQ',           icon: 'HelpCircle',  desc: 'Perguntas e respostas',         isStructural: true },
  'cta-final':    { label: 'CTA Final',     icon: 'Zap',         desc: 'Última chamada com preço',      isStructural: true },
  'text-image':   { label: 'Texto + Imagem', icon: 'LayoutPanelLeft', desc: 'Split layout (text/img)',  isStructural: false },
  'gallery':      { label: 'Galeria',       icon: 'Images',      desc: '2-4 imagens em grid',           isStructural: false },
  'stats':        { label: 'Estatísticas',  icon: 'BarChart3',   desc: '3-4 números com label',         isStructural: false },
  'quote':        { label: 'Citação',       icon: 'Quote',       desc: 'Bloco de citação em destaque',  isStructural: false },
  'countdown':    { label: 'Countdown',     icon: 'Timer',       desc: 'Contagem regressiva pra urgência', isStructural: false },
};

// ===== Defaults por tipo =====
let idCounter = 0;
function nextId(prefix = 'b'): string {
  idCounter++;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export function makeBlock(type: BlockType): Block {
  const id = nextId(type);
  switch (type) {
    case 'hero':
      return { id, type, data: { headline: '', subheadline: '', image: '', cta: 'Quero conhecer' } };
    case 'problem':
      return { id, type, data: { headline: 'Você se identifica com isso?', items: ['', '', ''] } };
    case 'solution':
      return { id, type, data: { headline: '', text: '', image: '' } };
    case 'benefits':
      return { id, type, data: { headline: 'O que você ganha', items: ['', '', '', ''] } };
    case 'testimonials':
      return { id, type, data: { headline: 'Resultados reais', items: [] } };
    case 'faq':
      return { id, type, data: { headline: 'Dúvidas comuns', items: [] } };
    case 'cta-final':
      return { id, type, data: { headline: 'Não deixe pra depois', subtext: '', cta: 'Garantir agora', urgency: '' } };
    case 'text-image':
      return { id, type, data: { headline: '', text: '', image: '', imagePosition: 'right' } };
    case 'gallery':
      return { id, type, data: { headline: '', columns: 3, images: [{ src: '', caption: '' }, { src: '', caption: '' }, { src: '', caption: '' }] } };
    case 'stats':
      return { id, type, data: { headline: '', items: [{ value: '', label: '' }, { value: '', label: '' }, { value: '', label: '' }] } };
    case 'quote':
      return { id, type, data: { text: '', author: '', role: '' } };
    case 'countdown': {
      // Default: 7 dias a partir de agora, formato ISO local
      const target = new Date();
      target.setDate(target.getDate() + 7);
      target.setHours(23, 59, 0, 0);
      const isoLocal = target.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
      return { id, type, data: { targetDate: isoLocal, headline: 'Oferta termina em', layout: 'box', expiredMessage: 'Oferta encerrada' } };
    }
  }
}

// ===== Migration do formato legacy (campos fixos hero/problem/etc) =====
/**
 * Converte landing no formato antigo (com campos fixos) pro formato all-blocks.
 * Mantém ordem: hero → problem → solution → benefits → testimonials → faq → cta-final
 */
export function migrateLegacyLanding(legacy: any): LandingPage {
  if (legacy.blocks && Array.isArray(legacy.blocks)) {
    return legacy as LandingPage; // já está no novo formato
  }

  const blocks: Block[] = [];

  if (legacy.hero) {
    blocks.push({ id: nextId('hero'), type: 'hero', data: { ...legacy.hero, cta: legacy.hero.cta || 'Quero conhecer' } });
  }
  if (legacy.problem && (legacy.problem.headline || legacy.problem.items?.length)) {
    blocks.push({ id: nextId('problem'), type: 'problem', data: legacy.problem });
  }
  if (legacy.solution && (legacy.solution.headline || legacy.solution.text)) {
    blocks.push({ id: nextId('solution'), type: 'solution', data: legacy.solution });
  }
  if (legacy.benefits && Array.isArray(legacy.benefits) && legacy.benefits.length > 0) {
    blocks.push({ id: nextId('benefits'), type: 'benefits', data: { headline: 'O que você ganha', items: legacy.benefits } });
  }
  if (legacy.testimonials && legacy.testimonials.length > 0) {
    blocks.push({ id: nextId('testimonials'), type: 'testimonials', data: { headline: 'Resultados reais', items: legacy.testimonials } });
  }
  if (legacy.faq && legacy.faq.length > 0) {
    blocks.push({ id: nextId('faq'), type: 'faq', data: { headline: 'Dúvidas comuns', items: legacy.faq } });
  }
  if (legacy.ctaFinal) {
    blocks.push({ id: nextId('cta'), type: 'cta-final', data: legacy.ctaFinal });
  }

  return {
    slug: legacy.slug || '',
    productSlug: legacy.productSlug || '',
    published: legacy.published !== false,
    createdAt: legacy.createdAt || new Date().toISOString(),
    blocks,
    seo: legacy.seo || { title: '', description: '' },
  };
}

export function findLandingBySlug(landings: any[], slug: string): LandingPage | null {
  const raw = landings.find(l => l.slug === slug && l.published !== false);
  return raw ? migrateLegacyLanding(raw) : null;
}

export function emptyLandingPage(): LandingPage {
  return {
    slug: '',
    productSlug: '',
    published: false,
    createdAt: new Date().toISOString(),
    blocks: [makeBlock('hero')],
    seo: { title: '', description: '' },
  };
}
