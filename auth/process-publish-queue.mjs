import { appendFileSync } from 'node:fs';
import { publicationDraft } from './publish-input.mjs';
import { readPost } from '../assets/post-format.js';

const firestore = 'https://firestore.googleapis.com/v1/projects/tecrel-blog/databases/(default)/documents';
const repo = 'https://api.github.com/repos/Tecrel/tecrel.github.io';
const jobs = '/publish-queue/';
const idPattern = /^[a-f0-9]{64}$/;
const shaPattern = /^[a-f0-9]{40}$/;

async function request(url, token, { method = 'GET', body } = {}) {
  if (!token) throw new Error('Missing workflow access token.');
  const response = await fetch(url, {
    method, redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const error = new Error(new URL(url).hostname + ' HTTP ' + response.status);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

const fire = (path, options) => request(firestore + path, process.env.FIRESTORE_ACCESS_TOKEN, options);
const github = (path, options) => request(repo + path, process.env.BLOG_GITHUB_TOKEN, options);
const jobId = doc => doc.name.split('/').at(-1);
const field = (doc, key) => doc.fields[key]?.stringValue;

async function findJobs(status) {
  const matches = await fire(':runQuery', { method: 'POST', body: {
    structuredQuery: {
      from: [{ collectionId: 'publish-queue' }],
      where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: status } } },
      limit: 20,
    },
  }});
  return matches.flatMap(row => row.document && idPattern.test(jobId(row.document)) ? [row.document] : []);
}

async function update(id, fields) {
  if (!idPattern.test(id)) throw new Error('Invalid job identifier.');
  const query = new URLSearchParams({ 'currentDocument.exists': 'true' });
  for (const key of Object.keys(fields)) query.append('updateMask.fieldPaths', key);
  await fire(jobs + id + '?' + query, { method: 'PATCH', body: {
    fields: Object.fromEntries(Object.entries(fields).map(([key, stringValue]) => [key, { stringValue }])),
  }});
}

async function publish(doc) {
  const id = jobId(doc);
  let draft;
  try {
    draft = publicationDraft(Object.fromEntries(['filename', 'markdown', 'baseSha'].map(key => [key, field(doc, key)])));
    const article = readPost(draft.markdown);
    if (!draft.filename.startsWith(article.date + '-') || !article.body.trim()) throw new Error('Invalid Markdown.');
  } catch {
    await update(id, { status: 'failed', reason: 'invalid' });
    return;
  }
  const path = 'posts/' + draft.filename;
  const resource = '/contents/' + path;
  const requested = Buffer.from(draft.markdown, 'utf8');
  let existing;
  try {
    existing = await github(resource + '?ref=main');
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  let result;
  if (existing?.type === 'file' && existing.encoding === 'base64' &&
      Buffer.from(existing.content, 'base64').equals(requested)) {
    const fingerprints = await github('/commits?' + new URLSearchParams({ sha: 'main', path, per_page: '1' }));
    result = { commit: fingerprints[0], content: existing };
  } else if ((existing?.sha || '') !== draft.baseSha) {
    await update(id, { status: 'failed', reason: 'conflict' });
    return;
  } else {
    const body = { branch: 'main', message: (existing ? 'Update ' : 'Publish ') + draft.filename, content: requested.toString('base64') };
    if (existing) body.sha = draft.baseSha;
    try {
      result = await github(resource, { method: 'PUT', body });
    } catch (error) {
      if ([409, 422].includes(error.status)) {
        // Leave pending once: the next run will recover a lost commit or see the conflict.
        throw error;
      }
      if ([401, 403, 404].includes(error.status)) {
        await update(id, { status: 'failed', reason: 'github-access' });
        return;
      }
      throw error;
    }
  }
  if (!shaPattern.test(result.commit?.sha) || !shaPattern.test(result.content?.sha)) throw new Error('Missing GitHub commit receipt.');
  await update(id, { status: 'committed', commit: result.commit.sha, blobSha: result.content.sha });
}

if (process.argv[2] === 'finish') {
  for (const id of JSON.parse(process.env.BLOG_DEPLOYED_IDS || '[]')) {
    await update(id, { status: 'published' });
  }
} else {
  const pending = await findJobs('pending');
  for (const doc of pending) {
    try { await publish(doc); }
    catch (error) {
      console.error('Publication remains queued:', error.message);
      process.exitCode = 1;
    }
  }
  const committed = (await findJobs('committed')).map(jobId);
  appendFileSync(process.env.GITHUB_OUTPUT, 'job_ids=' + JSON.stringify(committed) + '\n');
  appendFileSync(process.env.GITHUB_OUTPUT, 'deploy=' + Boolean(committed.length) + '\n');
}
