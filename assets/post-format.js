export const fields = ['title', 'date', 'category', 'description'];

export function escape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function readPost(source) {
  const separator = /\r?\n---\r?\n/.exec(source);
  if (!separator) throw new Error('文章缺少元数据分隔线。');
  const post = {};
  for (const line of source.slice(0, separator.index).split(/\r?\n/)) {
    const colon = line.indexOf(':');
    const key = line.slice(0, colon).trim();
    if (colon > 0 && fields.includes(key)) post[key] = line.slice(colon + 1).trim();
  }
  for (const key of fields) {
    if (!post[key]) throw new Error('文章缺少 ' + key + ' 字段。');
  }
  post.body = source.slice(separator.index + separator[0].length);
  return post;
}

export function writePost(post) {
  return fields.map(field => `${field}: ${post[field].trim()}`).join('\n')
    + '\n---\n' + post.body.trimEnd() + '\n';
}
