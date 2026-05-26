/**
 * Click tracker leve pra hoplinks afiliado.
 * - Em dev: escreve em src/data/clicks.json
 * - Em prod (Vercel filesystem read-only): silenciosamente skip;
 *   pra produção real, recomenda-se Supabase/PlanetScale/Vercel KV.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const CLICKS_PATH = path.resolve('src/data/clicks.json');
const MAX_EVENTS = 5000; // limita arquivo pra não crescer indefinidamente

interface ClickEvent {
  slug: string;
  ts: string;       // ISO timestamp
  referer?: string;
  ua?: string;
}

interface ClicksData {
  events: ClickEvent[];
  totals: Record<string, number>;
}

/**
 * Tenta registrar 1 click. Falha silently em ambiente read-only.
 */
export async function trackClick(
  slug: string,
  referer?: string | null,
  ua?: string | null,
): Promise<void> {
  try {
    let data: ClicksData = { events: [], totals: {} };
    try {
      const raw = await fs.readFile(CLICKS_PATH, 'utf-8');
      data = JSON.parse(raw);
      if (!Array.isArray(data.events)) data.events = [];
      if (!data.totals || typeof data.totals !== 'object') data.totals = {};
    } catch {
      // arquivo não existe ainda → começa zerado
    }

    data.events.unshift({
      slug,
      ts: new Date().toISOString(),
      referer: referer || undefined,
      ua: ua ? ua.slice(0, 200) : undefined,
    });

    if (data.events.length > MAX_EVENTS) {
      data.events = data.events.slice(0, MAX_EVENTS);
    }

    data.totals[slug] = (data.totals[slug] || 0) + 1;

    await fs.writeFile(CLICKS_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // read-only filesystem ou outro erro — apenas redireciona
  }
}

/**
 * Retorna número total de clicks por slug. Server-side helper.
 */
export async function getClickTotals(): Promise<Record<string, number>> {
  try {
    const raw = await fs.readFile(CLICKS_PATH, 'utf-8');
    const data = JSON.parse(raw) as ClicksData;
    return data.totals || {};
  } catch {
    return {};
  }
}

/**
 * Eventos recentes (últimos N).
 */
export async function getRecentClicks(limit = 100): Promise<ClickEvent[]> {
  try {
    const raw = await fs.readFile(CLICKS_PATH, 'utf-8');
    const data = JSON.parse(raw) as ClicksData;
    return (data.events || []).slice(0, limit);
  } catch {
    return [];
  }
}
