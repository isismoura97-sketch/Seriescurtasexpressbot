-- The owner form previously persisted the site root as the canonical URL.
-- Let the SEO resolver rebuild the correct per-series canonical instead.
update public.series
set canonical_url = null
where slug in (
  'a-fuga-da-amante-o-herdeiro-secreto-do-rei-lobo-18b2a5d2',
  'tentacao-proibida-meu-meio-irmao-bilionario-60bdcab0'
)
and canonical_url = 'https://seriescurtasexpressbot.vercel.app/';

-- This title was copied from the previous form submission. Preserve the
-- correct descriptions and cover while returning title fields to auto mode.
update public.series
set seo_title = null,
    og_title = null,
    alternate_title = null
where slug = 'tentacao-proibida-meu-meio-irmao-bilionario-60bdcab0'
and title = 'Tentação Proibida: Meu Meio- Irmão Bilionário'
and seo_title = 'A Fuga da Amante: O Herdeiro Secreto do Rei Lobo';
