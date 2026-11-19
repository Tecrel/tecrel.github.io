import MarkdownIt from 'markdown-it';
import footnotes from 'markdown-it-footnote';
import taskLists from 'markdown-it-task-lists';

export { escape, fields, readPost, writePost } from './post-format.js';

const parser = new MarkdownIt({ html: false, linkify: true, breaks: true })
  .use(taskLists)
  .use(footnotes);

export function markdown(body) {
  return parser.render(body);
}
