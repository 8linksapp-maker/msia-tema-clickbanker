import type { APIRoute } from 'astro';
import { readData } from '../../lib/readData';
import { trackClick } from '../../lib/clickTracker';
import type { Product } from '../../lib/products';

// Endpoint SSR (mesmo em output:'static' Astro 5 respeita prerender:false)
export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const slug = params.slug;

  if (!slug || typeof slug !== 'string') {
    return new Response('Bad request: missing slug', { status: 400 });
  }

  const products = readData('products.json', []) as Product[];
  const product = Array.isArray(products)
    ? products.find(p => p.slug === slug && p.active)
    : null;

  if (!product || !product.hoplink) {
    // Produto não encontrado ou inativo — redireciona pra home com 404 fallback
    return new Response(`Produto "${slug}" não encontrado ou inativo.`, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // Registra click (silently fails em filesystem read-only)
  const referer = request.headers.get('referer');
  const ua = request.headers.get('user-agent');
  await trackClick(slug, referer, ua);

  // Redirect 302 (não cacheia em SERPs/proxies)
  return new Response(null, {
    status: 302,
    headers: {
      'Location': product.hoplink,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
};
