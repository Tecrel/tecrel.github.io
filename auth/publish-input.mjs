export function publicationDraft(value) {
  if (!value || typeof value.filename !== 'string' || value.filename.length > 94 ||
      !/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(value.filename) ||
      typeof value.markdown !== 'string' || !value.markdown.trim() ||
      new TextEncoder().encode(value.markdown).length > 200_000 ||
      typeof value.baseSha !== 'string' || !/^(?:[a-f0-9]{40})?$/.test(value.baseSha)) {
    throw new Error('文章文件名或内容无效。正文必须小于 200 KB。');
  }
  return { filename: value.filename, markdown: value.markdown, baseSha: value.baseSha };
}
