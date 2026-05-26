import type { APIRoute } from 'astro';
import { getClickTotals, getRecentClicks } from '../../../lib/clickTracker';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const limit = Number(url.searchParams.get('limit') || '50');
    const slug = url.searchParams.get('slug');

    const totals = await getClickTotals();
    const recent = await getRecentClicks(limit);

    const filteredRecent = slug ? recent.filter(e => e.slug === slug) : recent;

    return new Response(JSON.stringify({
      totals,
      recent: filteredRecent,
      totalAllTime: Object.values(totals).reduce((a, b) => a + b, 0),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro ao ler clicks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
