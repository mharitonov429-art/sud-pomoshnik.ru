// Сборка сайта: content/*.md + data/*.json -> dist/. Без зависимостей (Node >= 20).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const R = path.dirname(fileURLToPath(import.meta.url));
const rd = p => fs.readFileSync(path.join(R, p), 'utf8').replace(/\r\n/g, '\n');
const site = JSON.parse(rd('data/site.json'));
const D = JSON.parse(rd('data/courts.json'));
const CSS = rd('src/style.css');
const OUT = path.join(R, 'dist');
const TODAY = process.env.BUILD_DATE || new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const hidden = new Set();

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = s => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '');
let NF = false;
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${u}"${u.startsWith('http') ? (NF ? ' rel="noopener nofollow"' : ' rel="noopener"') : ''}>${t}</a>`);

// ---------- мини-Markdown ----------
function md(src) {
  const out = [], faq = [], pre = [];
  let inFaq = false;
  src = src.replace(/```\n([\s\S]*?)\n```/g, (m, c) => { pre.push(c); return `\n\n@@PRE${pre.length - 1}@@\n\n`; });
  for (const b of src.trim().split(/\n\s*\n/)) {
    const t = b.trim(), L = t.split('\n');
    if (/^\{\{[\w-]+\}\}$/.test(t)) { out.push(t); continue; }
    const pm = t.match(/^@@PRE(\d+)@@$/); if (pm) { out.push(`<pre>${esc(pre[+pm[1]])}</pre>`); continue; }
    if (t.startsWith('## ')) { inFaq = /Частые вопросы/.test(t); out.push(`<h2>${inline(t.slice(3))}</h2>`); continue; }
    if (t.startsWith('### ')) { out.push(`<h3>${inline(t.slice(4))}</h3>`); if (inFaq) faq.push({ q: plain(t.slice(4)), a: '' }); continue; }
    if (L.every(l => l.startsWith('- '))) { out.push('<ul>' + L.map(l => `<li>${inline(l.slice(2))}</li>`).join('') + '</ul>'); continue; }
    if (L.every(l => /^\d+\. /.test(l))) { out.push('<ol>' + L.map(l => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`).join('') + '</ol>'); continue; }
    if (t.startsWith('|')) {
      const rows = L.filter(l => !/^\|[\s:|-]+\|$/.test(l)).map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      out.push('<div class="tw"><table><thead><tr>' + rows[0].map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.slice(1).map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (t.startsWith('> ')) { out.push(`<aside class="note">${inline(L.map(l => l.replace(/^> ?/, '')).join(' '))}</aside>`); continue; }
    out.push(`<p>${inline(L.join(' '))}</p>`);
    if (inFaq && faq.length) { const f = faq[faq.length - 1]; f.a += (f.a ? ' ' : '') + plain(L.join(' ')); }
  }
  return { html: out.join('\n'), faq };
}

// ---------- страницы из content/ ----------
const pages = [];
for (const f of fs.readdirSync(path.join(R, 'content')).filter(f => f.endsWith('.md')).sort()) {
  const m = rd('content/' + f).match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(f + ': нет front matter');
  const fm = {};
  m[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) fm[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  NF = fm.nofollow === 'true';
  if (fm.publish && fm.publish > TODAY) { hidden.add(fm.url); continue; }
  const { html, faq } = md(m[2]);
  NF = false;
  pages.push({ ...fm, related: (fm.related || '').split(',').map(s => s.trim()).filter(Boolean), html, faq, index: fm.index !== 'false', file: f });
}

// ---------- страницы из data/courts.json ----------
const courtBy = Object.fromEntries(D.courts.map(c => [c.slug, c]));
const distBy = Object.fromEntries(D.districts.map(d => [d.slug, d]));
const SUDRF = '[sudrf.ru](https://sudrf.ru/)';
const contactBlock = c => c.contacts ? c.contacts.map(x => `- ${x}`).join('\n') : c.address || c.phone
  ? `${c.address ? `Адрес: ${c.address}. ` : ''}${c.phone ? `Телефон: ${c.phone}.` : ''}`
  : `Адрес, телефоны и часы приёма смотрите на официальном сайте суда (поиск суда на ${SUDRF}). Мы не публикуем непроверенные контакты.`;

for (const c of D.courts) {
  const dn = c.districts.map(s => distBy[s].name);
  const body = `## Какие районы обслуживает\n\n${dn.map(n => `- [${n}](/rajony/${c.districts[dn.indexOf(n)]}/)`).join('\n')}\n\n## Где работает суд\n\n${c.seats.map(s => `- ${s}`).join('\n')}\n\n## Контакты\n\n${contactBlock(c)}\n\n## Что важно знать\n\nСудебные приказы выносят мировые судьи судебных участков, а не межрайонный суд: возражения на приказ подаются мировому судье, который его вынес. Заочное решение отменяет суд, который его вынес. Это может быть и мировой судья, и межрайонный суд: смотрите на копию решения.\n\nПомощь с документами: [отмена судебного приказа](/uslugi/otmena-sudebnogo-prikaza/), [отмена заочного решения](/uslugi/otmena-zaochnogo-resheniya/).`;
  const r = md(body);
  pages.push({ url: `/sudy/${c.slug}/`, title: `${c.short}: районы и населённые пункты`, description: `${c.short}: какие районы обслуживает и где работает. Справка для жителей северо-востока РБ, подсказка про мирового судью.`, h1: c.name, type: 'court', lastmod: site.checked, answer: `${c.short} обслуживает: ${dn.join(', ')}. Работает в населённых пунктах: ${c.seats.join(', ')}.`, related: ['/sudy/', '/kalkulyatory/kakoj-sud/'], html: r.html, faq: [], index: true });
}
for (const d of D.districts) {
  const c = courtBy[d.court];
  const r = md(`## Какой суд\n\nГражданские дела жителей района рассматривает [${c.short}](/sudy/${c.slug}/).\n\n## Мировой судья\n\n${d.mirovoj || `Судебные приказы выносит мировой судья судебного участка. Участок зависит от места жительства: найти его можно на ${SUDRF}.`}\n\n## Что делать, если пришёл приказ или решение\n\n- [Судебный приказ: что делать](/stati/sudebnyj-prikaz/chto-delat-esli-prishel/)\n- [Срок подачи возражений](/stati/sudebnyj-prikaz/srok-vozrazhenij/)\n- [Отмена заочного решения](/uslugi/otmena-zaochnogo-resheniya/)`);
  pages.push({ url: `/rajony/${d.slug}/`, title: `${d.name}: какой суд и мировой судья`, description: `${d.name} РБ (центр — ${d.center}): какой суд рассматривает дела, где искать мирового судью и что делать при судебном приказе.`, h1: `${d.name}: какой суд и мировой судья`, type: 'district', lastmod: site.checked, answer: d.answer || `Дела жителей района (${d.name}, центр — ${d.center}) рассматривает ${c.short}. Судебные приказы выносит мировой судья участка по месту жительства.`, related: ['/uslugi/otmena-sudebnogo-prikaza/'], html: r.html, faq: [], index: true });
}
const byUrl = Object.fromEntries(pages.map(p => [p.url, p]));

// ---------- вставки {{...}} ----------
const day = Math.floor(Date.now() / 86400000);
const PH = {
  'services-home': () => '<ul class="cards">' + pages.filter(p => p.type === 'service' && p.nohome !== 'true').map(p => `<li><a href="${p.url}">${esc(p.h1)}</a><br><span class="meta">${esc(p.card || '')}</span></li>`).join('') + '</ul>',
  services: () => '<ul class="cards">' + pages.filter(p => p.type === 'service').map(p => `<li><a href="${p.url}">${esc(p.h1)}</a><br><span class="meta">${esc(p.card || '')}</span></li>`).join('') + '</ul>',
  articles: () => '<ul>' + pages.filter(p => p.url.startsWith('/stati/sudebnyj-prikaz/') && p.type === 'article').map(p => `<li><a href="${p.url}">${esc(p.h1)}</a></li>`).join('') + '</ul>',
  bankrotstvo: () => '<ul>' + pages.filter(p => p.url.startsWith('/stati/bankrotstvo/') && p.type === 'article').map(p => `<li><a href="${p.url}">${esc(p.h1)}</a></li>`).join('') + '</ul>',
  courts: () => '<ul>' + D.courts.map(c => `<li><a href="/sudy/${c.slug}/">${esc(c.name)}</a> — ${esc(c.seats.join(', '))}</li>`).join('') + '</ul>',
  districts: () => '<ul>' + D.districts.map(d => `<li><a href="/rajony/${d.slug}/">${esc(d.name)}</a> (${esc(d.center)}) — ${esc(courtBy[d.court].short)}</li>`).join('') + '</ul>',
  calc: () => '<p><label for="d"><strong>Ваш район</strong></label><br><select id="d"><option value="">Показать все районы</option>' + D.districts.map(d => `<option value="${d.slug}">${esc(d.name)}</option>`).join('') + '</select></p>' +
    D.districts.map(d => { const c = courtBy[d.court]; return `<section data-d="${d.slug}"><h3>${esc(d.name)}</h3><p>Судебный приказ: мировой судья судебного участка по месту жительства (найти участок: <a href="https://sudrf.ru/" rel="noopener">sudrf.ru</a>). Иски и заочные решения: <a href="/sudy/${c.slug}/">${esc(c.short)}</a>. Подробнее: <a href="/rajony/${d.slug}/">страница района</a>.</p></section>`; }).join(''),
  'calc-srok': () => '<p><label for="t"><strong>Что считаем</strong></label><br><select id="t"><option value="10">Возражения на судебный приказ (10 дней)</option><option value="7">Заявление об отмене заочного решения (7 дней)</option></select></p><p><label for="r"><strong>Дата получения копии</strong></label><br><input type="date" id="r"></p><p><button type="button" id="go" class="btn">Рассчитать</button></p><div id="out" class="answer" aria-live="polite" hidden></div><noscript><p>Для расчёта нужен JavaScript. Правило: отсчёт начинается со следующего дня после получения копии, срок заканчивается в последний календарный день; если он выпал на выходной или праздник, срок переносится на ближайший рабочий день.</p></noscript>',
  'home-links': () => {
    const pool = pages.filter(p => p.index && p.url !== '/' && p.type !== 'hub' && p.type !== 'legal' && p.nohome !== 'true' && p.warn !== 'bankrot').sort((a, b) => a.url.localeCompare(b.url));
    const per = Math.min(10, pool.length), start = (day * per) % pool.length;
    return '<ul>' + Array.from({ length: per }, (_, i) => pool[(start + i) % pool.length]).map(p => `<li><a href="${p.url}">${esc(p.h1)}</a></li>`).join('') + '</ul>';
  },
};

// ---------- шаблон ----------
const NAV = [['/uslugi/', 'Услуги'], ['/stati/', 'Статьи'], ['/sudy/', 'Суды'], ['/rajony/', 'Районы'], ['/kalkulyatory/kakoj-sud/', 'Какой суд'], ['/ceny/', 'Цены'], ['/avtor/', 'Автор'], ['/kontakty/', 'Контакты']];
function crumbs(p) {
  const list = [{ n: 'Главная', u: '/' }];
  const segs = p.url.split('/').filter(Boolean);
  for (let i = 1; i < segs.length; i++) { const u = '/' + segs.slice(0, i).join('/') + '/'; if (byUrl[u]) list.push({ n: byUrl[u].crumb || byUrl[u].h1, u }); }
  if (p.url !== '/') list.push({ n: p.crumb || p.h1, u: p.url });
  return list;
}
const fmt = d => d.split('-').reverse().join('.');
function ld(p, cr) {
  const url = site.base + p.url, g = [];
  const person = { '@type': 'Person', name: site.author, telephone: site.phone, sameAs: [site.vk] };
  if (p.type === 'service') g.push({ '@type': 'Service', name: p.h1, description: p.description, url, provider: person, areaServed: 'Республика Башкортостан' });
  if (p.type === 'article') g.push({ '@type': 'Article', headline: p.h1, description: p.description, url, dateModified: p.lastmod, author: person, inLanguage: 'ru' });
  if (p.url === '/') g.push({ '@type': 'WebSite', name: site.name, url: site.base + '/', inLanguage: 'ru' });
  if (p.type === 'tool' && p.url !== '/kalkulyatory/kakoj-sud/') g.push({ '@type': 'SoftwareApplication', name: p.h1, description: p.description, url, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web', inLanguage: 'ru', offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' } });
  if (p.faq.length) g.push({ '@type': 'FAQPage', mainEntity: p.faq.filter(f => f.a).map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  if (p.url !== '/') g.push({ '@type': 'BreadcrumbList', itemListElement: cr.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.n, item: site.base + c.u })) });
  return g.map(x => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...x }).replace(/</g, '\\u003c')}</script>`).join('');
}
function render(p) {
  const cr = crumbs(p);
  const body = p.html.replace(/\{\{([\w-]+)\}\}/g, (m, k) => { if (!PH[k]) throw new Error(`${p.url}: нет вставки ${m}`); return PH[k](); });
  const rel = p.related.filter(u => byUrl[u]).map(u => `<li><a href="${u}">${esc(byUrl[u].h1)}</a></li>`).join('');
  const cta = (p.type === 'article' || p.type === 'service') && p.nocta !== 'true' ? `<p><a class="btn" href="tel:${site.phoneTel}">Позвонить ${site.phone}</a></p>` : '';
  const checked = p.checked ? `<p class="meta">Нормы закона сверены ${fmt(p.checked)} по открытым источникам. Перед подачей документов сверьтесь с актуальным текстом закона: справочные сведения не заменяют консультацию юриста.</p>` : '';
  const page = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
${p.index ? '' : '<meta name="robots" content="noindex">\n'}<link rel="canonical" href="${site.base}${p.url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><meta name="theme-color" content="#1f3a5f">
<meta property="og:type" content="website"><meta property="og:locale" content="ru_RU"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${site.base}${p.url}">
<style>${CSS}</style>
${ld(p, cr)}</head>
<body>
<header><div class="wrap"><a class="brand" href="/">${site.name}</a><nav>${NAV.map(([u, n]) => `<a href="${u}">${n}</a>`).join('')}</nav><a class="ph" href="tel:${site.phoneTel}">${site.phone}</a></div></header>
<main class="wrap">
${p.url === '/' ? '' : `<p class="crumbs">${cr.map((c, i) => i < cr.length - 1 ? `<a href="${c.u}">${esc(c.n)}</a>` : esc(c.n)).join(' › ')}</p>`}
<h1>${esc(p.h1)}</h1>
${p.warn === 'bankrot' ? '<aside class="warn"><strong>Важно.</strong> Банкротство влечет негативные последствия, в том числе ограничения на получение кредита и повторное банкротство в течение пяти лет. Предварительно обратитесь к своему кредитору и в МФЦ.</aside>' : ''}
${p.answer ? `<div class="answer">${inline(p.answer)}</div>` : ''}
${body}
${p.faq.length || !rel ? '' : ''}${rel ? `<h2>Читайте также</h2><ul>${rel}</ul>` : ''}
${cta}${checked}
${p.lastmod && p.index ? `<p class="meta">Страница обновлена ${fmt(p.lastmod)}.</p>` : ''}
</main>
<footer><div class="wrap"><p>${site.brand}</p><p>Информация на сайте справочная и не заменяет консультацию юриста. Исход каждого дела определяет суд.</p><p><a href="/politika/">Политика</a> · <a href="/soglasie/">Согласие</a> · <a href="/oferta/">Оферта</a> · <a href="/kontakty/">Контакты</a> · <a href="/avtor/">Об авторе</a> · <a href="/partnery/">Партнёры</a> · <a href="https://vk.ru/sudpomoshni" rel="noopener">ВКонтакте</a> · <a href="#cookies" id="cookie-settings">Настройки cookie</a></p></div></footer>
${p.url === '/kalkulyatory/kakoj-sud/' ? '<script src="/calc.js" defer></script>' : ''}${p.url === '/kalkulyatory/srok-vozrazhenij/' ? '<script src="/srok.js" defer></script>' : ''}<script src="/analytics.js" defer></script><script src="/consent.js" defer></script>
</body></html>`;
  return page.replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, (m, u, t) => (hidden.has(u) ? t : m));
}

// ---------- запись ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(path.join(R, 'public'))) fs.copyFileSync(path.join(R, 'public', f), path.join(OUT, f));
for (const f of ['analytics.js', 'calc.js', 'consent.js', 'srok.js']) fs.copyFileSync(path.join(R, 'src', f), path.join(OUT, f));
for (const p of pages) {
  const file = p.url === '/404/' ? path.join(OUT, '404.html') : path.join(OUT, p.url, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, render(p));
}
fs.writeFileSync(path.join(R, 'data/pages.json'), JSON.stringify(pages.filter(p => p.url !== '/404/').map(p => ({ url: p.url, lastmod: p.lastmod, index: p.index })), null, 1));
const r = spawnSync(process.execPath, [path.join(R, 'tools/generate-sitemap.mjs'), '--pages', path.join(R, 'data/pages.json'), '--base', site.base, '--out', OUT], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status);
console.log(`Готово: ${pages.length} страниц -> dist/` + (hidden.size ? ` (отложено до даты: ${hidden.size})` : ''));
