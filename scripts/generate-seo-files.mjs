import fs from 'node:fs/promises';
import path from 'node:path';

const API_URL = process.env.SERIES_API_URL || 'https://uyyeascxvnrkjtlygdoe.supabase.co/functions/v1/bot-unificado/api?action=series';
const SITE_URL = (process.env.SERIES_SITE_URL || 'https://seriescurtasexpressbot.vercel.app').replace(/\/+$/, '');
const outputPath = path.resolve(process.cwd(), 'series-app', 'sitemap.xml');
const appDirectory = path.resolve(process.cwd(), 'series-app');
const indexTemplatePath = path.join(appDirectory, 'index.html');
const seriesPagesDirectory = path.join(appDirectory, 'series');

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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function replaceMeta(html, attribute, key, value) {
  const escapedValue = escapeHtml(value);
  const pattern = new RegExp(`<meta\\s+${attribute}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="[^"]*"\\s*\/?>`, 'i');
  return html.replace(pattern, `<meta ${attribute}="${key}" content="${escapedValue}">`);
}

function isFreeSeries(serie) {
  return serie?.is_free === true || Number(serie?.price || 0) <= 0;
}

function buildSeriesHtml(template, serie, slug) {
  const pageUrl = `${SITE_URL}/series/${slug}`;
  const title = `${serie.title || 'Série'} — Série Curta Completa`;
  const description = String(serie.short_description || serie.description || `Conheça ${serie.title || 'esta série curta completa'}.`).slice(0, 160);
  const image = String(serie.cover_url || `${SITE_URL}/assets/logo-welcome.png`);
  const genres = String(serie.category || '').split(/[,/|;]/).map((entry) => entry.trim()).filter(Boolean);
  const duration = Number(serie.duration_minutes || 0);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: String(serie.title || ''),
    description,
    image,
    genre: genres.length ? genres : undefined,
    inLanguage: String(serie.language || 'pt-BR'),
    duration: duration > 0 ? `PT${Math.round(duration)}M` : undefined,
    url: pageUrl,
    offers: isFreeSeries(serie) ? undefined : {
      '@type': 'Offer',
      price: Number(serie.price || 0).toFixed(2),
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: pageUrl,
    },
  };

  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(html, 'property', 'og:type', 'video.movie');
  html = replaceMeta(html, 'property', 'og:title', title);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = replaceMeta(html, 'property', 'og:url', pageUrl);
  html = replaceMeta(html, 'property', 'og:image', image);
  html = replaceMeta(html, 'name', 'twitter:title', title);
  html = replaceMeta(html, 'name', 'twitter:description', description);
  html = replaceMeta(html, 'name', 'twitter:image', image);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(pageUrl)}">`);
  html = html.replace(/<script id="seriesStructuredData" type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script id="seriesStructuredData" type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`);
  return html;
}

const response = await fetch(API_URL, { headers: { accept: 'application/json' } });
if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
const catalog = await response.json();
if (!Array.isArray(catalog)) throw new Error('Catalog response is not an array');
const indexTemplate = await fs.readFile(indexTemplatePath, 'utf8');
await fs.rm(seriesPagesDirectory, { recursive: true, force: true });
await fs.mkdir(seriesPagesDirectory, { recursive: true });

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
  if (slug) {
    const pageDirectory = path.join(seriesPagesDirectory, slug);
    await fs.mkdir(pageDirectory, { recursive: true });
    await fs.writeFile(path.join(pageDirectory, 'index.html'), buildSeriesHtml(indexTemplate, serie, slug), 'utf8');
  }
  const categories = String(serie?.category || '').split(/[,/|;]/).map(slugify).filter(Boolean);
  categories.forEach((category) => urls.add(`${SITE_URL}/categoria/${category}`));
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls].map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}
</urlset>
`;

await fs.writeFile(outputPath, xml, 'utf8');
console.log(`Generated ${urls.size} URLs and ${catalog.length} series pages at ${outputPath}`);
