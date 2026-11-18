#!/usr/bin/env node
/**
 * generate-sitemap.mjs — sitemap.xml с разбивкой по типам страниц (Этап 4).
 *
 * Берёт тот же pages.json, что и rotate-links.mjs (Этап 2). Пишет:
 *   sitemap.xml                  — индекс
 *   sitemap-uslugi.xml           — /uslugi/
 *   sitemap-stati.xml            — /stati/
 *   sitemap-sudy-rajony.xml      — /sudy/ и /rajony/
 *   sitemap-servisy.xml          — /kalkulyatory/
 *   sitemap-keysy.xml            — /keysy/
 *   sitemap-prochee.xml          — главная, /avtor/, /kontakty/, /ceny/ и т. д.
 *
 * Запуск: node generate-sitemap.mjs --pages data/pages.json --base https://sud-pomoshnik.ru --out public
 *
 * Правила:
 *  - lastmod берётся из реальной даты изменения страницы (поле lastmod). Не выдумываем и не ставим «сегодня» всем.
 *  - changefreq и priority не пишем: Google их не использует.
 *  - страницы с "index": false в карту не попадают.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i += 2) opt[args[i].replace(/^--/, '')] = args[i + 1];
if (!opt.pages || !opt.base || !opt.out) { console.error('Нужны --pages, --base, --out'); process.exit(1); }

const base = opt.base.replace(/\/+$/, '');
const allPages = JSON.parse(fs.readFileSync(opt.pages, 'utf8'));
const pages = allPages.filter(p => p.index !== false);

const GROUPS = [
  { file: 'sitemap-uslugi.xml',     test: u => u.startsWith('/uslugi/') },
  { file: 'sitemap-stati.xml',      test: u => u.startsWith('/stati/') },
  { file: 'sitemap-sudy-rajony.xml',test: u => u.startsWith('/sudy/') || u.startsWith('/rajony/') },
  { file: 'sitemap-servisy.xml',    test: u => u.startsWith('/kalkulyatory/') },
  { file: 'sitemap-keysy.xml',      test: u => u.startsWith('/keysy/') },
  { file: 'sitemap-prochee.xml',    test: () => true },   // всё остальное
];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const iso = d => (d ? new Date(d).toISOString().slice(0, 10) : null);

fs.mkdirSync(opt.out, { recursive: true });
const used = new Set();
const written = [];

for (const g of GROUPS) {
  const items = pages.filter(p => !used.has(p.url) && g.test(p.url));
  items.forEach(p => used.add(p.url));
  if (!items.length) continue;
  if (items.length > 50000) throw new Error(`${g.file}: больше 50 000 адресов, нужно делить`);
  items.sort((a, b) => a.url.localeCompare(b.url));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.map(p => {
    const lm = iso(p.lastmod);
    return `  <url>\n    <loc>${esc(base + p.url)}</loc>${lm ? `\n    <lastmod>${lm}</lastmod>` : ''}\n  </url>`;
  }).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(opt.out, g.file), xml);
  const maxLm = items.map(p => p.lastmod).filter(Boolean).sort().pop();
  written.push({ file: g.file, lastmod: iso(maxLm), count: items.length });
}

const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${written.map(w => `  <sitemap>\n    <loc>${esc(base + '/' + w.file)}</loc>${w.lastmod ? `\n    <lastmod>${w.lastmod}</lastmod>` : ''}\n  </sitemap>`).join('\n')}
</sitemapindex>
`;
fs.writeFileSync(path.join(opt.out, 'sitemap.xml'), index);
for (const w of written) console.log(`${w.file}: ${w.count} адр., lastmod ${w.lastmod ?? '—'}`);
console.log(`Всего адресов: ${written.reduce((a, w) => a + w.count, 0)} (исключено закрытых от индекса: ${allPages.length - pages.length})`);
