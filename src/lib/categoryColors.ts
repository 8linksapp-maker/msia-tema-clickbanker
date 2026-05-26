/**
 * Mapeamento categoria → cor OKLCH committed.
 * Tema "Afiliado ClickBank" — cada nicho de produto tem sua cor de assinatura.
 * Ordem importa — define a sequência dos blocos coloridos na home.
 */
export type CategoryColor = 'terracota' | 'azul-tinta' | 'oliva' | 'ocre' | 'vinho';

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  'Saúde & Emagrecimento':   'oliva',        // verde-natural, sem ser óbvio
  'Finanças Pessoais':       'vinho',        // sério, premium
  'Relacionamentos':         'terracota',    // warmth humana
  'Negócios Online':         'ocre',         // gold/ambição
  'Desenvolvimento Pessoal': 'azul-tinta',   // clarity/mind
};

export const CATEGORY_ORDER = [
  'Saúde & Emagrecimento',
  'Finanças Pessoais',
  'Relacionamentos',
  'Negócios Online',
  'Desenvolvimento Pessoal',
];

/** Pega a cor de uma categoria, fallback rotativo se desconhecida. */
export function colorForCategory(category: string | undefined, index = 0): CategoryColor {
  if (category && CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const fallback: CategoryColor[] = ['terracota', 'azul-tinta', 'oliva', 'ocre', 'vinho'];
  return fallback[index % fallback.length];
}

/** Hex preview pra admin/preview. */
export const COLOR_HEX: Record<CategoryColor, string> = {
  'terracota':   '#c55c3e',
  'azul-tinta':  '#3458a2',
  'oliva':       '#5f7436',
  'ocre':        '#c49838',
  'vinho':       '#8c344c',
};
