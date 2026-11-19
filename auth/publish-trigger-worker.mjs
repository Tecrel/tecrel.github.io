import { Buffer } from 'node:buffer';
import { sign } from 'node:crypto';

const blogOrigin = 'https://tecrel.github.io';
const githubApi = 'https://api.github.com';
const firestoreQueue = 'https://firestore.googleapis.com/v1/projects/tecrel-blog/databases/(default)/documents/publish-queue/';
const workflow = '/repos/Tecrel/tecrel.github.io/actions/workflows/publish-queue.yml/dispatches';

function reply(status, stage, upstreamStatus) {
  return new Response(null, { status, headers: {
    'Access-Control-Allow-Origin': blogOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization',
    'Access-Control-Expose-Headers': 'X-Publish-Stage, X-Publish-Upstream-Status',
    ...(stage ? { 'X-Publish-Stage': stage } : {}),
    ...(upstreamStatus ? { 'X-Publish-Upstream-Status': String(upstreamStatus) } : {}),
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  }});
}

async function githubPost(path, token, data) {
  return fetch(githubApi + path, {
    method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(8000),
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Tecrel-blog-publisher' },
    body: JSON.stringify(data),
  });
}

function appProof(env) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = encode({ alg: 'RS256', typ: 'JWT' }) + '.'
    + encode({ iss: env.GITHUB_APP_ID, iat: now - 60, exp: now + 540 });
  return unsigned + '.' + sign('RSA-SHA256', Buffer.from(unsigned), env.GITHUB_APP_PRIVATE_KEY).toString('base64url');
}

export default {
  async fetch(request, env) {
    const path = /^\/publish\/([a-f0-9]{64})$/.exec(new URL(request.url).pathname);
    const origin = request.headers.get('Origin');
    if (!path || origin !== blogOrigin) return reply(404);
    if (request.method === 'OPTIONS') return reply(204);
    if (request.method !== 'POST') return reply(405);
    const authorization = request.headers.get('Authorization') || '';
    if (authorization.length > 8192 || !/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(authorization)) return reply(401);
    let stage = 'queue-read';
    try {
      // Firestore authenticates the Firebase token and applies the author-only rules.
      const receipt = await fetch(firestoreQueue + path[1] + '?mask.fieldPaths=status', {
        headers: { Authorization: authorization }, redirect: 'manual', signal: AbortSignal.timeout(6000),
      });
      if ([401, 403, 404].includes(receipt.status)) return reply(403);
      if (!receipt.ok) return reply(502, stage, receipt.status);
      if ((await receipt.json()).fields?.status?.stringValue !== 'pending') return reply(204);
      if (!/^\d+$/.test(env.GITHUB_INSTALLATION_ID) || !env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
        return reply(503);
      }
      stage = 'app-proof';
      const proof = appProof(env);
      stage = 'app-token';
      const installation = await githubPost('/app/installations/' + env.GITHUB_INSTALLATION_ID + '/access_tokens', proof, {
        repository_ids: [1463729197], permissions: { actions: 'write' },
      });
      if (!installation.ok) return reply(502, stage, installation.status);
      const { token } = await installation.json();
      if (typeof token !== 'string' || !token) return reply(502, stage);
      stage = 'actions-dispatch';
      const dispatch = await githubPost(workflow, token, { ref: 'main' });
      return dispatch.ok ? reply(202) : reply(502, stage, dispatch.status);
    } catch {
      return reply(502, stage);
    }
  },
};
