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

function inline(line) {
  const syntax = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let output = '';
  let end = 0;
  for (const match of line.matchAll(syntax)) {
    output += escape(line.slice(end, match.index));
    if (match[1]) output += '<code>' + escape(match[1]) + '</code>';
    else if (match[2]) output += '<strong>' + escape(match[2]) + '</strong>';
    else output += `<a href="${escape(match[4])}" rel="noopener noreferrer">${escape(match[3])}</a>`;
    end = match.index + match[0].length;
  }
  return output + escape(line.slice(end));
}

export function markdown(body) {
  const parts = body.trimEnd().split(/^[ \t]*```[^\n]*\n([\s\S]*?)^[ \t]*```[ \t]*(?=\r?$)/m);
  const blocks = [];
  for (const [index, part] of parts.entries()) {
    if (index % 2) {
      blocks.push('<pre><code>' + escape(part.replace(/\r?\n$/, '')) + '</code></pre>');
      continue;
    }
    for (const block of part.trim().split(/\r?\n[ \t]*\r?\n/).filter(Boolean)) {
      const heading = /^(#{1,3}) (.+)$/.exec(block);
      const lines = block.split(/\r?\n/);
      if (heading) {
        const level = Math.max(2, heading[1].length);
        blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      } else if (lines.every(line => /^[-*] /.test(line))) {
        blocks.push('<ul>' + lines.map(line => '<li>' + inline(line.slice(2)) + '</li>').join('') + '</ul>');
      } else {
        blocks.push('<p>' + lines.map(inline).join('<br>') + '</p>');
      }
    }
  }
  return blocks.join('\n');
}
