/**
 * Banco central de produtos afiliado.
 * Cada produto cadastrado uma vez aqui, referenciado em N posts via slug.
 * Trocar o hoplink atualiza em todos os posts automaticamente.
 */

export interface Product {
  slug: string;            // identificador único, ex: 'renovacao-metabolica'
  name: string;            // 'Programa Renovação Metabólica'
  category: string;        // bate com src/data/categories.json
  vendor?: string;         // nome do produtor/vendor (opcional)

  hoplink: string;         // URL completo ClickBank ou afiliado
  price: string;           // formatado: 'R$ 297' ou 'US$ 47'
  originalPrice?: string;  // se promo, preço original cortado

  rating?: string;         // '4.7' (string pra preservar formatação)
  reviewCount?: number;    // n avaliações que você baseou

  blurb: string;           // 1-2 frases curtas (sidebar widget, comparator)
  description?: string;    // texto longo (página single produto, opcional)

  pros?: string[];         // bullets prós (comparator)
  cons?: string[];         // bullets contras (comparator)

  bestFor?: string;        // 'iniciantes' / 'intermediário' (comparator col)

  image?: string;          // URL da capa do produto (opcional)

  commission?: number;     // % comissão (admin only, não mostra ao público)
  gravity?: number;        // ClickBank gravity score (admin only)

  active: boolean;         // false = não renderiza nem redireciona
  featuredInSidebar?: boolean;
  createdAt: string;       // ISO timestamp
}

/**
 * Helper pra buscar produto por slug.
 * Use no server-side (getCollection, Astro frontmatter).
 */
export function findProductBySlug(products: Product[], slug: string): Product | null {
  return products.find(p => p.slug === slug && p.active) || null;
}

/**
 * Filtra produtos ativos por categoria.
 */
export function productsByCategory(products: Product[], category: string): Product[] {
  return products.filter(p => p.active && p.category === category);
}

/**
 * Top produtos pra sidebar (featured + active).
 */
export function featuredProducts(products: Product[], limit = 3): Product[] {
  return products
    .filter(p => p.active && p.featuredInSidebar)
    .slice(0, limit);
}
