import { copyFileSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { escape, markdown, readPost } from './assets/markdown.js';
import { authMenu, authDialog } from './auth/auth-ui.mjs';

process.chdir(fileURLToPath(new URL('.', import.meta.url)));
mkdirSync('dist', { recursive: true });
for (const file of readdirSync('dist', { withFileTypes: true })) {
  if (file.isFile() && file.name.endsWith('.html')) unlinkSync('dist/' + file.name);
}
mkdirSync('dist/assets', { recursive: true });
const readerAssets = new Set(['archive.js', 'cover.webp', 'style.css', 'posts-index.json']);
const auth = process.env.BLOG_AUTH_SITE_CONFIG ? JSON.parse(process.env.BLOG_AUTH_SITE_CONFIG) : null;
const authFiles = ['auth.js', 'auth.css', 'firebase-service.mjs', 'publish-input.mjs'];
if (auth) {
  const { firebase, providers } = auth;
  if (!firebase || !['apiKey', 'authDomain', 'projectId', 'appId'].every(key => typeof firebase[key] === 'string' && firebase[key]) ||
      firebase.authDomain !== firebase.projectId + '.firebaseapp.com' ||
      !Array.isArray(providers) || !providers.includes('github') ||
      !providers.every(provider => ['github', 'google', 'phone'].includes(provider))) {
    throw new Error('Invalid BLOG_AUTH_SITE_CONFIG. See the authentication setup guide.');
  }
  for (const asset of [...authFiles, 'auth-config.js']) readerAssets.add(asset);
}
for (const file of readdirSync('dist/assets', { withFileTypes: true })) {
  if (file.isFile() && !readerAssets.has(file.name)) unlinkSync('dist/assets/' + file.name);
}
for (const file of ['archive.js', 'cover.webp', 'style.css']) copyFileSync('assets/' + file, 'dist/assets/' + file);
if (auth) {
  for (const file of authFiles) copyFileSync('auth/' + file, 'dist/assets/' + file);
  const publicConfig = Object.fromEntries(['apiKey', 'authDomain', 'projectId', 'appId'].map(key => [key, auth.firebase[key]]));
  writeFileSync('dist/assets/auth-config.js', `export const config = ${JSON.stringify(publicConfig)};\nexport const providers = ${JSON.stringify(auth.providers)};\n`);
}

const github = 'https://github.com/Tecrel';
const project = github + '/Personal_Agent_Lynn';
const base = 'https://tecrel.github.io';

const posts = readdirSync('posts').filter(file => file.endsWith('.md')).map(file => {
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(file)) {
    throw new Error('Expected YYYY-MM-DD-slug.md: ' + file);
  }
  return { ...readPost(readFileSync('posts/' + file, 'utf8')), slug: file.slice(0, -3) };
}).sort((a, b) => b.date.localeCompare(a.date));

writeFileSync('dist/assets/posts-index.json', JSON.stringify(posts.map(({ slug, title, date, category }) => ({
  filename: slug + '.md', title, date, category,
}))));

const date = post => `<time datetime="${escape(post.date)}">${escape(post.date.replaceAll('-', '.'))}</time>`;
const postUrl = post => `./${encodeURIComponent(post.slug)}.html`;
const cover = `<img class="cover" src="./assets/cover.webp" alt="荒原上独立的射电望远镜，远处是低矮的山脉" width="1536" height="1024">`;
const arrow = '<span aria-hidden="true">↗</span>';
const header = active => `
  <a class="skip" href="#main">跳至内容</a>
  <header class="topbar">
    <a class="site-name" href="./index.html"><span class="mark" aria-hidden="true">T</span> Tecrel 的博客</a>
    <nav aria-label="主导航">
      <a href="./index.html${posts.length ? '#notes' : ''}" ${active === 'notes' ? 'aria-current="page"' : ''}>${posts.length ? '文章' : '首页'}</a>
      <a href="./about.html" ${active === 'about' ? 'aria-current="page"' : ''}>关于</a>
      <a href="${github}">GitHub ${arrow}</a>
      ${auth ? authMenu : ''}
    </nav>
  </header>`;

const footer = `
  <footer class="footer">
    <span>© 2026 Tecrel</span>
    <a href="./feed.xml">RSS 订阅</a>
  </footer>`;

function page(title, content, active, description = 'Tecrel 的技术、研究与科幻创作笔记。') {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(description)}">
  <title>${escape(title)} · Tecrel</title>
  <link rel="stylesheet" href="./assets/style.css">
  ${auth ? '<link rel="stylesheet" href="./assets/auth.css">' : ''}
  <link rel="alternate" type="application/rss+xml" title="Tecrel 的博客" href="./feed.xml">
</head>
<body>
  <div class="shell">
    ${header(active)}
    <main id="main">${content}</main>
    ${auth ? authDialog : ''}
    ${footer}
  </div>
</body>
</html>`;
}

const featured = posts[0];
const categories = [...new Set(posts.map(post => post.category))];
const rows = posts.map(post => `
  <article class="post" data-category="${escape(post.category)}" data-search="${escape([post.title, post.description, post.category].join(' '))}">
    ${date(post)}
    <div>
      <h3><a href="${postUrl(post)}">${escape(post.title)}</a></h3>
      <p>${escape(post.description)}</p>
    </div>
    <span class="category">${escape(post.category)}</span>
  </article>`).join('');

writeFileSync('dist/index.html', page('个人博客', `
  <section class="masthead" aria-labelledby="masthead">
    <h1 id="masthead">Tecrel<span>.</span></h1>
    <p>技术笔记、Agent 研究<br>和科幻创作。</p>
  </section>
  ${featured ? `<section class="feature" aria-labelledby="feature-title">
    <a class="feature-cover" href="${postUrl(featured)}" aria-label="阅读《${escape(featured.title)}》">${cover}</a>
    <div class="feature-copy">
      <div class="feature-meta"><span>精选文章</span>${date(featured)}</div>
      <div>
        <h2 id="feature-title"><a href="${postUrl(featured)}">${escape(featured.title)}</a></h2>
        <p>${escape(featured.description)}</p>
      </div>
      <a class="read-link" href="${postUrl(featured)}">阅读全文 ${arrow}</a>
    </div>
  </section>` : `<section class="feature" aria-label="博客封面">
    <div class="feature-cover">${cover}</div>
    <div class="feature-copy empty-feature"><h2>文章筹备中。</h2></div>
  </section>`}
  ${posts.length ? `<section class="journal" id="notes" aria-labelledby="journal-title">
    <div class="section-head">
      <h2 id="journal-title">文章索引</h2>
      <span>${posts.length} 篇</span>
    </div>
    <div class="archive-tools" hidden>
      <div class="filters" role="group" aria-label="按分类筛选">
        <button type="button" aria-pressed="true">全部</button>
        ${categories.map(category => `<button type="button" data-filter="${escape(category)}" aria-pressed="false">${escape(category)}</button>`).join('')}
      </div>
      <label class="search"><span>搜索</span><input type="search" placeholder="标题或关键词" autocomplete="off"></label>
    </div>
    <div>${rows}</div>
    <p id="empty" hidden>没有找到符合条件的文章。</p>
    <p class="sr-only" id="count" aria-live="polite"></p>
  </section><script src="./assets/archive.js" defer></script>` : ''}
  <aside class="project">
    <div><h2>正在做 · LYNNING</h2><p>关于记忆、主动性与交互形式的个人 Agent 项目。</p></div>
    <a href="${project}">项目仓库 ${arrow}</a>
  </aside>`, 'notes'));

for (const [index, post] of posts.entries()) {
  const next = posts[index + 1] ?? (index > 0 ? posts[0] : null);
  const content = `
    <a class="back" href="./index.html#notes"><span aria-hidden="true">←</span> 文章索引</a>
    <div class="article-heading">
      <div class="article-meta">${date(post)}<span>${escape(post.category)}</span></div>
      <h1>${escape(post.title)}</h1>
      <p class="dek">${escape(post.description)}</p>
    </div>
    ${post === featured ? `<figure class="article-cover">${cover}</figure>` : ''}
    <article class="prose">${markdown(post.body)}</article>
    ${next ? `<div class="next"><span>继续阅读</span><a href="${postUrl(next)}">${escape(next.title)} ${arrow}</a></div>` : ''}`;
  writeFileSync(`dist/${post.slug}.html`, page(post.title, content, 'notes', post.description));
}

writeFileSync('dist/about.html', page('关于', `
  <section class="about">
    <div class="about-title"><h1>关于<br><span>Tecrel.</span></h1></div>
    <div class="prose">
      <p class="dek">我是一名本科生，也写科幻小说。</p>
      <p>这里记录技术探索、研究笔记，以及还在形成中的想法。</p>
      <h2>正在构建</h2>
      <p>LYNNING 是我持续推进的个人 Agent 项目。泠这个名字，最初来自我的科幻小说。我关心长期记忆、Traits，以及让 Agent 自己参与决定交互方式的 Reaction。</p>
      <p><a href="${project}">浏览 LYNNING ${arrow}</a></p>
      <h2>关于这个站</h2>
      <p>这里会陆续发布技术、研究与创作笔记。</p>
      <p><a href="${github}">GitHub ${arrow}</a> · <a href="./feed.xml">RSS</a></p>
    </div>
  </section>`, 'about'));

const items = posts.map(post => `<item>
  <title>${escape(post.title)}</title>
  <link>${base}/${encodeURIComponent(post.slug)}.html</link>
  <guid>${base}/${encodeURIComponent(post.slug)}.html</guid>
  <description>${escape(post.description)}</description>
</item>`).join('\n');
writeFileSync('dist/feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Tecrel 的博客</title><link>${base}/</link>
  <description>技术笔记、Agent 研究和科幻创作。</description>
  ${items}
</channel></rss>`);

writeFileSync('dist/404.html', page('页面未找到', `
  <section class="missing">
    <h1>页面未找到</h1>
    <a class="read-link" href="${base}/">回到首页 ${arrow}</a>
  </section>`));
writeFileSync('dist/.nojekyll', '');
console.log(`Built ${posts.length} posts, home, about, 404 and RSS.`);
