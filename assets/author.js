import { escape, fields, markdown, readPost, writePost } from './markdown.js';

const form = document.querySelector('#writer-form');
const inputs = Object.fromEntries([...fields, 'slug', 'body'].map(name => [name, form.elements.namedItem(name)]));
const preview = document.querySelector('#writer-preview');
const filenameLabel = document.querySelector('#filename');
const status = document.querySelector('#save-status');
const github = document.querySelector('#github-editor');
const githubUpdate = document.querySelector('#github-update');
const storageKey = 'tecrel-blog:article-draft:v1';
const repository = 'https://github.com/Tecrel/tecrel.github.io';
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const filenamePattern = /^\d{4}-\d{2}-\d{2}-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
let imported = '';

function draft() {
  return Object.fromEntries(Object.entries(inputs).map(([name, input]) => [name, input.value]));
}

function currentFilename(post) {
  return post.date && slugPattern.test(post.slug) ? `${post.date}-${post.slug}.md` : '';
}

function render(post = draft()) {
  const filename = currentFilename(post);
  filenameLabel.textContent = filename ? 'posts/' + filename : '填写日期和文件名后缀';
  github.href = `${repository}/new/main/posts${filename ? '?filename=' + encodeURIComponent(filename) : ''}`;
  githubUpdate.hidden = !imported || filename !== imported;
  if (!githubUpdate.hidden) githubUpdate.href = `${repository}/edit/main/posts/${encodeURIComponent(filename)}`;
  preview.innerHTML = `<h2>${escape(post.title || '无标题')}</h2>
    ${post.description ? `<p class="dek">${escape(post.description)}</p>` : ''}
    ${markdown(post.body)}`;
}

function save() {
  const post = draft();
  render(post);
  try {
    localStorage.setItem(storageKey, JSON.stringify({ post, imported }));
    status.textContent = '草稿已保存在此浏览器';
  } catch {
    status.textContent = '无法保存到浏览器，请下载 .md 备份。';
  }
}

function restore(post) {
  for (const [name, input] of Object.entries(inputs)) {
    input.value = typeof post[name] === 'string' ? post[name] : '';
  }
  inputs.date.value ||= new Intl.DateTimeFormat('sv-SE').format(new Date());
  render();
}

function validated() {
  if (!form.reportValidity()) return null;
  const post = draft();
  if ([...fields, 'body'].some(field => !post[field].trim())) {
    status.textContent = '请填写完整的文章资料与正文。';
    return null;
  }
  return post;
}

form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('input', event => {
  if (event.target !== document.querySelector('#import-post')) save();
});

document.querySelector('#copy-post').addEventListener('click', async () => {
  const post = validated();
  if (!post) return;
  try {
    await navigator.clipboard.writeText(writePost(post));
    status.textContent = '已复制，可以在 GitHub 编辑页粘贴。';
  } catch {
    status.textContent = '无法访问剪贴板，请使用「下载 .md」。';
  }
});

document.querySelector('#download-post').addEventListener('click', () => {
  const post = validated();
  if (!post) return;
  const url = URL.createObjectURL(new Blob([writePost(post)], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = currentFilename(post);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.querySelector('#import-post').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    const post = readPost(await file.text());
    const filename = filenamePattern.exec(file.name);
    if (Object.entries(draft()).some(([name, value]) => name !== 'date' && value.trim())
        && !confirm('导入会替换当前草稿。继续吗？')) return;
    imported = filename ? file.name : '';
    restore({ ...post, slug: filename?.[1] ?? '' });
    save();
  } catch (error) {
    status.textContent = '导入失败。' + error.message;
  }
});

document.querySelector('#clear-post').addEventListener('click', () => {
  if (!confirm('清空此浏览器中的当前草稿？')) return;
  imported = '';
  restore({});
  save();
  status.textContent = '草稿已清空。';
});

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  imported = typeof saved?.imported === 'string' && filenamePattern.test(saved.imported) ? saved.imported : '';
  restore(saved?.post ?? {});
  if (saved) status.textContent = '已恢复此浏览器中的草稿';
} catch {
  restore({});
}
