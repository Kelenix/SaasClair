// Génère le portail de documentation (HTML) et sa version PDF, aux couleurs de SaasClair.
//
//   npm run docs:build     → docs-site/dist/ (portail) + docs/SaasClair-documentation.pdf
//
// Sources : docs-site/content/*.md (pages), docs-site/assets/captures/ (npm run docs:capture),
// logos fournis dans public/brand/ (utilisés tels quels).

import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { marked } from "marked";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "docs-site", "content");
const DIST = path.join(ROOT, "docs-site", "dist");
const PDF = path.join(ROOT, "docs", "SaasClair-documentation.pdf");
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());

// ---------- Lecture des pages ----------

const escapeHtml = (text) =>
  text.replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );

const pages = fs
  .readdirSync(CONTENT)
  .filter((file) => file.endsWith(".md"))
  .sort()
  .map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT, file), "utf8");
    const [, front = "", body = raw] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
    const meta = Object.fromEntries(
      front
        .split("\n")
        .map((line) => line.match(/^(\w+):\s*(.*)$/))
        .filter(Boolean)
        .map(([, key, value]) => [key, value]),
    );
    return { slug: file.replace(/^\d+-/, "").replace(/\.md$/, ""), ...meta, body };
  });

// Images : chemin du portail, et légende tirée du texte alternatif.
const renderer = new marked.Renderer();
renderer.image = ({ href, text }) =>
  `<figure><img src="assets/${href}" alt="${escapeHtml(text)}" loading="lazy"><figcaption>${escapeHtml(text)}</figcaption></figure>`;
marked.use({ renderer, gfm: true });

for (const page of pages) page.html = marked.parse(page.body);

// ---------- Gabarit ----------

const CSS = `
:root{--forest:#064E3B;--forest-deep:#043A2C;--emerald:#10B981;--emerald-ink:#047857;--gold:#F5B700;
--gold-ink:#8F5F00;--cream:#FAF7F0;--ink:#13261F;--slate:#55675F;--line:#E8E1D3;--sand:#F1EBDD}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--cream);color:var(--ink);font:16px/1.65 Inter,system-ui,sans-serif}
a{color:var(--emerald-ink);text-underline-offset:3px}a:focus-visible{outline:2px solid var(--emerald-ink);outline-offset:2px}
.top{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:16px;padding:14px 28px;background:var(--forest)}
.top img{height:26px}.top span{color:#FAF7F0cc;font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
.top .version{margin-left:auto;font-size:12px;letter-spacing:0;text-transform:none;background:#ffffff14;padding:4px 10px;border-radius:999px}
.layout{display:grid;grid-template-columns:260px minmax(0,1fr);max-width:1240px;margin:0 auto}
nav.side{position:sticky;top:56px;align-self:start;height:calc(100vh - 56px);overflow:auto;padding:28px 18px;border-right:1px solid var(--line)}
nav.side p{margin:0 0 10px 12px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--slate)}
nav.side a{display:block;padding:9px 12px;border-radius:12px;color:var(--ink);text-decoration:none;font-size:14px}
nav.side a:hover{background:var(--sand)}nav.side a[aria-current]{background:#D1FAE5;color:var(--forest);font-weight:700}
main{padding:40px 48px 64px;min-width:0}
h1,h2,h3{font-family:Fraunces,Georgia,serif;color:var(--forest);line-height:1.15;font-weight:600}
h1{font-size:42px;margin:0 0 12px}h2{font-size:27px;margin:44px 0 12px}h3{font-size:20px;margin:28px 0 8px}
.lead{font-size:18px;color:var(--slate);margin:0 0 28px}
table{width:100%;border-collapse:collapse;margin:18px 0;background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;font-size:14.5px}
th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{background:#FBF9F4;color:var(--slate);font-size:12.5px;font-weight:700}tr:last-child td{border-bottom:0}
blockquote{margin:22px 0;padding:14px 18px;border-left:4px solid var(--gold);background:#fff;border-radius:0 14px 14px 0;color:var(--ink)}
blockquote p{margin:0}
code{background:var(--sand);padding:2px 6px;border-radius:6px;font-size:.9em}
pre{background:var(--forest-deep);color:#FAF7F0e6;padding:16px 18px;border-radius:14px;overflow:auto}pre code{background:none;padding:0;color:inherit}
figure{margin:26px 0;background:#fff;border:1px solid var(--line);border-radius:18px;padding:10px;box-shadow:0 14px 40px -24px #064E3B55}
figure img{display:block;width:100%;height:auto;border-radius:10px}
figcaption{padding:10px 6px 2px;font-size:13px;color:var(--slate);text-align:center}
ul,ol{padding-left:22px}li{margin:4px 0}input[type=checkbox]{accent-color:var(--emerald);margin-right:8px}
.pager{display:flex;justify-content:space-between;gap:16px;margin-top:56px;padding-top:24px;border-top:1px solid var(--line)}
.pager a{display:block;padding:14px 18px;border:1px solid var(--line);border-radius:16px;background:#fff;text-decoration:none;color:var(--forest);font-weight:600;max-width:48%}
.pager small{display:block;color:var(--slate);font-weight:400}
footer{padding:24px;text-align:center;color:var(--slate);font-size:13px;border-top:1px solid var(--line)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin-top:28px}
.cards a{display:block;padding:20px;background:#fff;border:1px solid var(--line);border-radius:20px;text-decoration:none;color:var(--ink);box-shadow:0 10px 30px -22px #064E3B66;transition:transform .2s}
.cards a:hover{transform:translateY(-3px)}.cards strong{display:block;font-family:Fraunces,Georgia,serif;font-size:20px;color:var(--forest);margin-bottom:6px}
.hero{padding:56px 48px;background:var(--forest);color:#FAF7F0;border-radius:0 0 28px 28px}
.hero img{height:46px;margin-bottom:28px}.hero h1{color:#FAF7F0;font-size:48px}.hero p{color:#FAF7F0cc;font-size:19px;max-width:620px}
@media (max-width:860px){.layout{grid-template-columns:1fr}nav.side{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}main{padding:28px 18px}.hero{padding:36px 20px}h1{font-size:34px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
`;

const head = (title, description) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Documentation SaasClair</title>
<meta name="description" content="${escapeHtml(description ?? "")}">
<link rel="icon" href="assets/brand/monogram.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>`;

const topBar = `<header class="top"><a href="index.html" aria-label="Accueil de la documentation"><img src="assets/brand/wordmark-inverse.png" alt="SaasClair"></a><span>Documentation</span><span class="version">Version ${version}</span></header>`;

const sideNav = (current) =>
  `<nav class="side" aria-label="Sommaire"><p>Sommaire</p>${pages
    .map(
      (page) =>
        `<a href="${page.slug}.html"${page.slug === current ? ' aria-current="page"' : ""}>${escapeHtml(page.title)}</a>`,
    )
    .join("")}</nav>`;

const footer = `<footer>SaasClair · Documentation version ${version} · ${today} · Données de démonstration dans les captures</footer></body></html>`;

// ---------- Portail ----------

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, "assets", "brand"), { recursive: true });
for (const file of ["wordmark.png", "wordmark-inverse.png", "monogram.png"]) {
  fs.copyFileSync(
    path.join(ROOT, "public", "brand", file),
    path.join(DIST, "assets", "brand", file),
  );
}
const captures = path.join(ROOT, "docs-site", "assets", "captures");
if (fs.existsSync(captures))
  fs.cpSync(captures, path.join(DIST, "assets", "captures"), { recursive: true });

fs.writeFileSync(
  path.join(DIST, "index.html"),
  `${head("Accueil", "Documentation de SaasClair")}${topBar}
<section class="hero"><img src="assets/brand/wordmark-inverse.png" alt="SaasClair">
<h1>Documentation de SaasClair</h1>
<p>Comprenez votre SaaS en 5 minutes, pas en 5 semaines. Tout ce qu'il faut pour utiliser, administrer, configurer et faire évoluer l'application.</p></section>
<main style="max-width:1100px;margin:0 auto"><div class="cards">${pages
    .map(
      (page) =>
        `<a href="${page.slug}.html"><strong>${escapeHtml(page.title)}</strong>${escapeHtml(page.description ?? "")}</a>`,
    )
    .join("")}</div>
<p style="margin-top:32px;color:var(--slate)">Version imprimable : <a href="SaasClair-documentation.pdf">SaasClair-documentation.pdf</a></p></main>${footer}`,
);

pages.forEach((page, index) => {
  const previous = pages[index - 1];
  const next = pages[index + 1];
  const pager = `<div class="pager">${
    previous
      ? `<a href="${previous.slug}.html"><small>Précédent</small>${escapeHtml(previous.title)}</a>`
      : "<span></span>"
  }${next ? `<a href="${next.slug}.html" style="text-align:right"><small>Suivant</small>${escapeHtml(next.title)}</a>` : ""}</div>`;
  const html = page.html.replace(
    /<\/h1>/,
    `</h1><p class="lead">${escapeHtml(page.description ?? "")}</p>`,
  );
  fs.writeFileSync(
    path.join(DIST, `${page.slug}.html`),
    `${head(page.title, page.description)}${topBar}<div class="layout">${sideNav(page.slug)}<main>${html}${pager}</main></div>${footer}`,
  );
});

// ---------- PDF (couverture, sommaire, toutes les pages) ----------

const printCss = `
@page{size:A4;margin:18mm 16mm 20mm}
body{background:#fff;font-size:11.5pt}
.cover{height:257mm;display:flex;flex-direction:column;justify-content:space-between;background:var(--forest);color:#FAF7F0;padding:28mm 18mm;margin:-18mm -16mm 0;page-break-after:always}
.cover img{height:16mm;align-self:flex-start}.cover h1{color:#FAF7F0;font-size:40pt;margin:0}.cover p{color:#FAF7F0cc;font-size:14pt;margin:8px 0 0}
.toc{page-break-after:always}.toc ol{font-size:13pt;line-height:2}
.chapter{page-break-before:always}h1{font-size:28pt}h2{font-size:18pt;page-break-after:avoid}
figure,table,pre{page-break-inside:avoid}figure{box-shadow:none}
`;
const printHtml = `${head("Documentation complète", "")}<style>${printCss}</style>
<section class="cover"><img src="assets/brand/wordmark-inverse.png" alt="SaasClair">
<div><h1>Documentation</h1><p>Comprenez votre SaaS en 5 minutes, pas en 5 semaines.</p></div>
<p>Version ${version} · ${today}</p></section>
<section class="toc"><h1>Sommaire</h1><ol>${pages.map((page) => `<li>${escapeHtml(page.title)} — <span style="color:var(--slate)">${escapeHtml(page.description ?? "")}</span></li>`).join("")}</ol></section>
${pages.map((page) => `<section class="chapter">${page.html}</section>`).join("")}</body></html>`;
const printFile = path.join(DIST, "impression.html");
fs.writeFileSync(printFile, printHtml);

const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
const page = await browser.newPage();
await page.goto(pathToFileURL(printFile).href, { waitUntil: "networkidle" });
// Les polices de la marque (Fraunces, Inter) doivent être chargées avant l'impression.
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: PDF,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;font:8pt Inter,sans-serif;color:#55675F;padding:0 16mm;display:flex;justify-content:space-between"><span>SaasClair · Documentation ${version}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
});
await browser.close();
fs.copyFileSync(PDF, path.join(DIST, "SaasClair-documentation.pdf"));
fs.rmSync(printFile);

const pdfSize = Math.round(fs.statSync(PDF).size / 1024);
console.log(`✓ Portail : docs-site/dist/index.html (${pages.length} pages)`);
console.log(`✓ PDF : docs/SaasClair-documentation.pdf (${pdfSize} Ko)`);
