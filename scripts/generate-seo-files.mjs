import fs from 'node:fs/promises';
import path from 'node:path';

const API_URL = process.env.SERIES_API_URL || 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api?action=series';
const SITE_URL = (process.env.SERIES_SITE_URL || 'https://seriescurtasexpressbot.vercel.app').replace(/\/+$/, '');
const outputPath = path.resolve(process.cwd(), 'series-app', 'sitemap.xml');

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character]);
}

const response = await fetch(API_URL, { headers: { accept: 'application/json' } });
if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
const catalog = await response.json();
if (!Array.isArray(catalog)) throw new Error('Catalog response is not an array');

const urls = new Set([
  `${SITE_URL}/`,
  `${SITE_URL}/busca`,
  `${SITE_URL}/favoritos`,
  `${SITE_URL}/categoria/gratuitas`,
  `${SITE_URL}/categoria/dubladas`,
  `${SITE_URL}/categoria/legendadas`,
  `${SITE_URL}/ajuda`,
  `${SITE_URL}/termos`,
  `${SITE_URL}/privacidade`,
  `${SITE_URL}/blog`,
  `${SITE_URL}/blog/o-que-sao-series-curtas-verticais`,
]);

for (const serie of catalog) {
  const slug = String(serie?.slug || '').trim() || slugify(serie?.title || serie?.id);
  if (slug) urls.add(`${SITE_URL}/series/${slug}`);
  const categories = String(serie?.category || '').split(/[,/|;]/).map(slugify).filter(Boolean);
  categories.forEach((category) => urls.add(`${SITE_URL}/categoria/${category}`));
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls].map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}
</urlset>
`;

await fs.writeFile(outputPath, xml, 'utf8');
console.log(`Generated ${urls.size} URLs at ${outputPath}`);
