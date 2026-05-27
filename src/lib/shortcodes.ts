/**
 * Sistema de shortcodes inline pra posts de afiliado.
 *
 * Sintaxe (visível no editor):
 *   [[produto:slug-do-produto]]            → card de produto (estilo hero)
 *   [[comparador:slug-a,slug-b,slug-c]]    → tabela comparativa
 *
 * HTML retornado usa inline styles pra funcionar igual no preview admin
 * e no front, sem depender de CSS externo.
 */

import type { Product } from './products';
import { parseVideoUrl } from './videoEmbed';

// Match shortcode possivelmente envolvido por <p>...</p> ou <p>...<br></p>
// Capturamos a tag p wrapper pra remover (não pode ter <a> ou <table> dentro de <p>)
const PRODUTO_RE = /(?:<p[^>]*>\s*(?:<br\s*\/?>)?)?\s*\[\[\s*produto\s*:\s*([a-z0-9][a-z0-9-]*)\s*\]\]\s*(?:(?:<br\s*\/?>)?<\/p>)?/gi;
const COMPARADOR_RE = /(?:<p[^>]*>\s*(?:<br\s*\/?>)?)?\s*\[\[\s*comparador\s*:\s*([a-z0-9,\-\s]+)\s*\]\]\s*(?:(?:<br\s*\/?>)?<\/p>)?/gi;
// [[video:URL]] — URL pode conter ?, &, = e demais caracteres URL. Tudo até `]]` é capturado
const VIDEO_RE = /(?:<p[^>]*>\s*(?:<br\s*\/?>)?)?\s*\[\[\s*video\s*:\s*([^\]]+?)\s*\]\]\s*(?:(?:<br\s*\/?>)?<\/p>)?/gi;

// Detector simples só pra checagem (sem strip de p tags)
const PRODUTO_DETECT = /\[\[\s*produto\s*:\s*([a-z0-9][a-z0-9-]*)\s*\]\]/gi;
const COMPARADOR_DETECT = /\[\[\s*comparador\s*:\s*([a-z0-9,\-\s]+)\s*\]\]/gi;
const VIDEO_DETECT = /\[\[\s*video\s*:\s*([^\]]+?)\s*\]\]/gi;

// Tokens do tema afiliado-clickbank (terracota + earthy + Cabinet Grotesk)
const C = {
  primary: '#a3592d',
  primaryDarker: '#8c4d27',
  ink: '#1e293b',
  inkMuted: '#475569',
  inkFaint: '#94a3b8',
  border: '#e2e8f0',
  borderHover: '#a3592d',
  surface: '#ffffff',
  elev: '#fefcf9',
};

const F = {
  display: `'Cabinet Grotesk', system-ui, -apple-system, sans-serif`,
  body: `'Switzer', system-ui, -apple-system, sans-serif`,
  mono: `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`,
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Card de produto (estilo hero, igual ao variant="hero" do ProductCard.astro) */
function renderProductCard(product: Product): string {
  const name = escapeHtml(product.name);
  const blurb = escapeHtml(product.blurb || '');
  const price = escapeHtml(product.price);
  const originalPrice = product.originalPrice ? escapeHtml(product.originalPrice) : '';
  const rating = product.rating ? escapeHtml(product.rating) : '';
  const bestFor = product.bestFor ? escapeHtml(product.bestFor) : '';
  const image = product.image ? escapeHtml(product.image) : '';
  const goUrl = `/go/${product.slug}`;

  const cardStyle = [
    'display:block',
    `background:${C.surface}`,
    `border:1px solid ${C.border}`,
    'border-radius:8px',
    'padding:1.5rem',
    'margin:2.25rem 0',
    'text-decoration:none',
    'transition:border-color .2s ease, transform .2s ease',
    `font-family:${F.body}`,
    `color:${C.inkMuted}`,
    'overflow:hidden',
  ].join(';');

  // Layout: imagem 140px square à esquerda (quando há) + conteúdo flex à direita
  const imageBlock = image
    ? `<div style="flex-shrink:0;width:140px;height:140px;background:#f1f5f9;border-radius:6px;overflow:hidden;border:1px solid ${C.border};">
        <img src="${image}" alt="${name}" loading="lazy" style="display:block;width:100%;height:100%;object-fit:cover;" />
      </div>`
    : '';

  return `<a href="${goUrl}" target="_blank" rel="noopener nofollow sponsored" class="not-prose product-shortcode-card" data-shortcode="produto" style="${cardStyle}">
    <p style="font-family:${F.mono};font-size:.7rem;text-transform:uppercase;color:${C.inkFaint};letter-spacing:.05em;margin:0 0 1rem 0;font-weight:500;">produto desta análise</p>
    <div style="display:flex;gap:1.5rem;align-items:flex-start;flex-wrap:wrap;">
      ${imageBlock}
      <div style="flex:1;min-width:200px;display:grid;grid-template-columns:1fr auto;gap:1.5rem;align-items:end;">
        <div style="min-width:0;">
          <h3 style="font-family:${F.display};font-size:1.5rem;font-weight:800;color:${C.ink};line-height:1.15;margin:0 0 .625rem 0;letter-spacing:-.022em;">${name}</h3>
          ${blurb ? `<p style="color:${C.inkMuted};line-height:1.55;margin:0 0 .875rem 0;font-size:.9375rem;">${blurb}</p>` : ''}
          <div style="display:flex;gap:1rem;font-family:${F.mono};font-size:.7rem;flex-wrap:wrap;align-items:center;">
            ${rating ? `<span style="color:${C.primary};font-weight:700;">★ ${rating}</span>` : ''}
            ${bestFor ? `<span style="color:${C.inkMuted};"><span style="color:${C.inkFaint};">melhor pra:</span> ${bestFor}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.625rem;text-align:right;">
          ${originalPrice ? `<span style="font-family:${F.mono};font-size:.7rem;color:${C.inkFaint};text-decoration:line-through;">${originalPrice}</span>` : ''}
          <span style="font-family:${F.display};font-size:1.625rem;font-weight:800;color:${C.primary};line-height:1;">${price}</span>
          <span style="background:${C.primary};color:white;padding:.5625rem 1rem;border-radius:4px;font-weight:600;font-size:.8125rem;display:inline-flex;align-items:center;gap:.5rem;font-family:${F.body};white-space:nowrap;">
            Conhecer agora
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </div>
      </div>
    </div>
  </a>`;
}

/** Tabela comparativa */
function renderComparator(products: Product[]): string {
  if (products.length === 0) {
    return `<div class="not-prose" style="padding:1rem;background:#fef3c7;border:1px dashed #d97706;border-radius:6px;color:#92400e;font-family:${F.mono};font-size:.8rem;margin:2rem 0;">[[comparador]] — nenhum produto válido encontrado.</div>`;
  }

  const wrapStyle = [
    'margin:2rem 0',
    `border:1px solid ${C.border}`,
    'border-radius:8px',
    'overflow:hidden',
    `background:${C.surface}`,
  ].join(';');

  const tableStyle = 'width:100%;border-collapse:collapse;font-size:.875rem;';
  const thBase = `padding:.875rem 1rem;font-family:${F.mono};font-size:.7rem;text-transform:uppercase;color:${C.inkFaint};letter-spacing:.05em;font-weight:500;background:${C.elev};border-bottom:1px solid ${C.border};text-align:left;`;
  const tdBase = `padding:1rem;border-bottom:1px solid ${C.border};vertical-align:top;color:${C.inkMuted};font-family:${F.body};`;

  const rows = products.map((p, idx) => {
    const isLast = idx === products.length - 1;
    const tdEnd = isLast ? tdBase.replace(`border-bottom:1px solid ${C.border};`, '') : tdBase;

    const name = escapeHtml(p.name);
    const cat = escapeHtml(p.category || '');
    const blurb = escapeHtml(p.blurb || '');
    const rating = p.rating ? escapeHtml(p.rating) : '—';
    const bestFor = escapeHtml(p.bestFor || '—');
    const price = escapeHtml(p.price);
    const image = p.image ? escapeHtml(p.image) : '';

    const thumbCell = image
      ? `<img src="${image}" alt="${name}" loading="lazy" style="display:block;width:54px;height:54px;border-radius:4px;object-fit:cover;flex-shrink:0;" />`
      : '';

    return `<tr>
      <td style="${tdEnd}">
        <div style="display:flex;gap:.75rem;align-items:flex-start;">
          ${thumbCell}
          <div style="min-width:0;">
            <div style="font-family:${F.display};font-weight:700;color:${C.ink};font-size:1rem;line-height:1.2;">${name}</div>
            <div style="font-family:${F.mono};font-size:.65rem;text-transform:uppercase;color:${C.inkFaint};margin-top:.375rem;letter-spacing:.04em;">${cat}</div>
            ${blurb ? `<div style="font-size:.75rem;color:${C.inkMuted};margin-top:.5rem;line-height:1.5;max-width:24ch;">${blurb}</div>` : ''}
          </div>
        </div>
      </td>
      <td style="${tdEnd}text-align:center;font-family:${F.mono};color:${C.primary};font-weight:700;white-space:nowrap;">★ ${rating}</td>
      <td style="${tdEnd}font-size:.75rem;color:${C.inkMuted};font-family:${F.body};">${bestFor}</td>
      <td style="${tdEnd}text-align:right;font-family:${F.display};font-weight:800;color:${C.primary};font-size:1.0625rem;white-space:nowrap;">${price}</td>
      <td style="${tdEnd}text-align:right;">
        <a href="/go/${p.slug}" target="_blank" rel="noopener nofollow sponsored" style="font-family:${F.mono};text-transform:uppercase;font-size:.7rem;color:${C.ink};text-decoration:underline;text-underline-offset:3px;font-weight:500;white-space:nowrap;">ver →</a>
      </td>
    </tr>`;
  }).join('');

  return `<div class="not-prose product-shortcode-comparator" data-shortcode="comparador" style="${wrapStyle}">
    <table style="${tableStyle}">
      <thead>
        <tr>
          <th style="${thBase}">Produto</th>
          <th style="${thBase}text-align:center;">Rating</th>
          <th style="${thBase}">Melhor pra</th>
          <th style="${thBase}text-align:right;">Preço</th>
          <th style="${thBase}text-align:right;">Link</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/** Embed responsivo de vídeo (16:9, lazy-load iframe) — sem JS pra ser render-only */
function renderVideoEmbed(url: string): string {
  const info = parseVideoUrl(url);
  if (info.provider === 'unknown') {
    return `<div class="not-prose" style="padding:.5rem 1rem;background:#fef3c7;border:1px dashed #d97706;border-radius:4px;color:#92400e;font-family:${F.mono};font-size:.8rem;margin:1rem 0;">[[video:${escapeHtml(url)}]] — URL não reconhecida</div>`;
  }
  const wrapStyle = `position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;margin:1.75rem 0;`;
  if (info.provider === 'mp4') {
    return `<div class="not-prose" style="${wrapStyle}"><video controls preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;"><source src="${escapeHtml(info.embedUrl)}" />Seu navegador não suporta vídeo HTML5.</video></div>`;
  }
  return `<div class="not-prose" style="${wrapStyle}"><iframe src="${escapeHtml(info.embedUrl)}" loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe></div>`;
}

/**
 * Processa string HTML do post, substituindo shortcodes pelo HTML renderizado.
 * Server-side OU client-side.
 *
 * IMPORTANTE: o regex captura também o <p>...</p> wrapper opcional ao redor do
 * shortcode (Quill embrulha cada linha em <p>). Isso evita HTML inválido
 * (<a> bloco dentro de <p> inline) que o browser tenta "reparar" gerando boxes
 * vazios na renderização.
 */
export function renderShortcodes(html: string, products: Product[] = []): string {
  if (!html) return '';
  const byslug = new Map(products.map(p => [p.slug, p]));

  // [[produto:slug]] — substitui incluindo <p> wrapper
  let out = html.replace(PRODUTO_RE, (_match, slug) => {
    const p = byslug.get(String(slug).trim().toLowerCase());
    if (!p || !p.active) {
      return `<div class="not-prose" style="padding:.5rem 1rem;background:#fef3c7;border:1px dashed #d97706;border-radius:4px;color:#92400e;font-family:${F.mono};font-size:.8rem;margin:1rem 0;">[[produto:${escapeHtml(String(slug))}]] — produto não encontrado ou inativo</div>`;
    }
    return renderProductCard(p);
  });

  // [[comparador:a,b,c]] — substitui incluindo <p> wrapper
  out = out.replace(COMPARADOR_RE, (_match, slugList) => {
    const slugs = String(slugList).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const found = slugs.map(s => byslug.get(s)).filter((p): p is Product => !!p && p.active);
    return renderComparator(found);
  });

  // [[video:URL]] — embed responsivo (YouTube/Vimeo/mp4/iframe genérico)
  out = out.replace(VIDEO_RE, (_match, rawUrl) => renderVideoEmbed(String(rawUrl).trim()));

  // Limpa <p></p> vazios consecutivos (do Quill quando aluno aperta Enter várias vezes)
  out = out.replace(/<p[^>]*>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, '');
  // Limpa quebras de linha extras entre blocos
  out = out.replace(/(<\/(?:a|div|table)>)\s*\n\s*(<(?:a|div|table|h[1-6]|p|ul|ol|blockquote))/gi, '$1\n$2');

  return out;
}

/**
 * Detecta shortcodes inseridos no HTML. Útil pra validação/preview.
 */
/** Heurística rápida pra detectar se o body tem algum shortcode. */
export function hasShortcodes(html: string): boolean {
  return /\[\[\s*(?:produto|comparador|video)\s*:/i.test(html);
}

export function detectShortcodes(html: string): { produto: string[]; comparador: string[][]; video: string[] } {
  const produto: string[] = [];
  const comparador: string[][] = [];
  const video: string[] = [];

  const m1 = html.matchAll(PRODUTO_DETECT);
  for (const m of m1) produto.push(m[1].trim().toLowerCase());

  const m2 = html.matchAll(COMPARADOR_DETECT);
  for (const m of m2) {
    comparador.push(m[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  }

  const m3 = html.matchAll(VIDEO_DETECT);
  for (const m of m3) video.push(m[1].trim());

  return { produto, comparador, video };
}
