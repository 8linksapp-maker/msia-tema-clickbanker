import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        heroImage: z.string().optional(),
        category: z.string().optional(),
        author: z.string().optional(),
        order: z.number().optional(),

        // ===== Afiliado features =====
        // Slug do produto principal (gera hero card + schema.org Review)
        productSlug: z.string().optional(),

        // Lista de slugs pra renderizar tabela comparativa
        comparedProductSlugs: z.array(z.string()).optional(),

        // Lista de produtos relacionados (renderiza cards no fim do post)
        featuredProductSlugs: z.array(z.string()).optional(),

        // Disclaimer ético inline no topo (default true em sites afiliado)
        affiliate: z.boolean().default(true),
    }),
});

export const collections = { blog };
