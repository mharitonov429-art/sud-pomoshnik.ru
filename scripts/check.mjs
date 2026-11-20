// Проверка собранного сайта (dist/): метатеги, H1, canonical, внутренние ссылки, карта сайта, заглушки.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk(dist), htmls = files.filter(f => f.endsWith('.html') && !/^(yandex_|google)/.test(path.basename(f)));
const errs = [], titles = new Map();
const exists = u => { const p = path.join(dist, u.replace(/[?#].*$/, '')); return fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, 'index.html'))); };
for (const f of htmls) {
  const h = fs.readFileSync(f, 'utf8'), rel = path.relative(dist, f), is404 = rel === '404.html';
  const title = (h.match(/<title>(.*?)<\/title>/) || [])[1] || '', desc = (h.match(/<meta name="description" content="(.*?)">/) || [])[1] || '';
  const un = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  if (!title) errs.push(`${rel}: нет title`); else if (un(title).length > 60) errs.push(`${rel}: title ${un(title).length} > 60`);
  if (!desc) errs.push(`${rel}: нет description`); else if (un(desc).length > 160) errs.push(`${rel}: description ${un(desc).length} > 160`);
  if ((h.match(/<h1[ >]/g) || []).length !== 1) errs.push(`${rel}: H1 не ровно один`);
  if (!/<link rel="canonical" href="https:\/\/sud-pomoshnik\.ru\/[^"]*">/.test(h)) errs.push(`${rel}: нет canonical`);
  if (is404 && !h.includes('noindex')) errs.push('404.html без noindex');
  if (/\[ЗАПОЛНИТЬ|undefined|\{\{/.test(h)) errs.push(`${rel}: остались заглушки`);
  if (titles.has(title)) errs.push(`${rel}: дубль title с ${titles.get(title)}`); titles.set(title, rel);
  for (const m of h.matchAll(/<img\b[^>]*>/g)) { const t = m[0]; if (!/ alt="[^"]+"/.test(t) || !/ width="\d+"/.test(t) || !/ height="\d+"/.test(t)) errs.push(`${rel}: img без alt/width/height`); const s = (t.match(/ src="([^"]+)"/) || [])[1]; if (s && !exists(s)) errs.push(`${rel}: нет файла картинки ${s}`); }
  for (const m of h.matchAll(/href="(\/[^"]*)"/g)) { if (/index\.html/.test(m[1])) errs.push(`${rel}: ссылка на index.html ${m[1]}`); if (!exists(m[1])) errs.push(`${rel}: битая ссылка ${m[1]}`); }
}
const sm = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
if (!sm.includes('<urlset')) errs.push('sitemap.xml должен быть единым списком адресов (urlset)');
if (files.some(f => /sitemap-.*\.xml$/.test(f))) errs.push('остались лишние sitemap-*.xml');
const locs = [...sm.matchAll(/<loc>https:\/\/sud-pomoshnik\.ru(\/[^<]*)<\/loc>/g)].map(m => m[1]);
for (const u of locs) if (!u.endsWith('/') || !exists(u)) errs.push(`карта: плохой адрес ${u}`);
const pagesNoindex = htmls.filter(f => fs.readFileSync(f, 'utf8').includes('name="robots" content="noindex"')).length;
if (locs.length !== htmls.length - pagesNoindex) errs.push(`карта: ${locs.length} адресов, страниц для индекса ${htmls.length - pagesNoindex}`);
if (errs.length) { console.error(errs.join('\n')); console.error(`\nОШИБОК: ${errs.length}`); process.exit(1); }
console.log(`OK: ${htmls.length} HTML-страниц, в sitemap ${locs.length} адресов, ошибок нет`);
