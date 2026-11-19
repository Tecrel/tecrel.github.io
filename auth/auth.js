import { config, providers } from './auth-config.js';
import { connect } from './firebase-service.mjs';

const open = document.querySelector('#login-open');
const close = document.querySelector('#login-close');
const logout = document.querySelector('#logout');
const toggle = document.querySelector('#view-toggle');
const dialog = document.querySelector('#login-dialog');
const feedback = document.querySelector('#login-feedback');
const reload = document.querySelector('#login-reload');
const accountFeedback = document.querySelector('#account-feedback');
const panel = document.querySelector('#author-panel');
const main = document.querySelector('#main');
const oauthButtons = [...dialog.querySelectorAll('[data-provider]')];
const phone = document.querySelector('#phone-form');
const code = document.querySelector('#code-form');
let confirmation;
let frame;
let frameObserver;
let sessionRevision = 0;
let oauthRevision = 0;
const previewKey = 'tecrel-blog:reader-preview';

function readPreview() {
  if (new URLSearchParams(location.search).get('view') === 'reader') return true;
  try { return sessionStorage.getItem(previewKey) === '1'; }
  catch { return false; }
}

let readerPreview = readPreview();

function rememberPreview() {
  try {
    if (readerPreview) sessionStorage.setItem(previewKey, '1');
    else sessionStorage.removeItem(previewKey);
  } catch { /* The current page can still switch views. */ }
}

function setPreview(enabled) {
  readerPreview = enabled;
  rememberPreview();
  if (!enabled) {
    const url = new URL(location.href);
    if (url.searchParams.get('view') === 'reader') {
      url.searchParams.delete('view');
      history.replaceState(history.state, '', url);
    }
  }
  if (readerPreview) showReader();
  else showAuthor();
}

rememberPreview();
window.addEventListener('pageshow', event => {
  if (event.persisted) setPreview(readPreview());
});

function showReader() {
  panel.hidden = true;
  main.hidden = false;
  toggle.textContent = '作者工作台';
}

function showAuthor() {
  if (!frame) return;
  main.hidden = true;
  panel.hidden = false;
  toggle.textContent = '读者预览';
}

function notice(message) {
  accountFeedback.textContent = message;
  accountFeedback.hidden = !message;
}

function loginError(error) {
  const messages = {
    'auth/popup-blocked': '浏览器拦截了登录窗口，请允许弹窗后重试。',
    'auth/popup-closed-by-user': '登录窗口已关闭，可以重新登录。',
    'auth/network-request-failed': '没有连接到登录服务。请检查网络后重试。',
    'auth/account-exists-with-different-credential': '此邮箱已通过另一种方式注册，请使用原来的登录方式。',
    'auth/too-many-requests': '请求过多，请稍后再试。',
    'auth/invalid-verification-code': '验证码有误，请重试。',
  };
  feedback.textContent = messages[error?.code] || '登录未完成，请确认网络连接后重试。';
}

open.addEventListener('click', () => dialog.showModal());
close.addEventListener('click', () => dialog.close());
reload.addEventListener('click', () => location.reload());
toggle.addEventListener('click', () => setPreview(!readerPreview));

for (const button of oauthButtons) {
  button.hidden = !providers.includes(button.dataset.provider);
  button.disabled = true;
}
document.querySelector('#phone-login').hidden = !providers.includes('phone');
for (const button of dialog.querySelectorAll('button[type="submit"]')) button.disabled = true;

function setOAuthBusy(busy) {
  for (const button of oauthButtons) button.disabled = busy;
}

const startupTimer = setTimeout(() => {
  feedback.textContent = '登录服务连接超时。检查网络后可以重新载入博客。';
  reload.hidden = false;
}, 15_000);

try {
  const service = await connect(config);
  let authorUser = null;
  window.addEventListener('message', async event => {
    if (event.origin !== location.origin || !frame || event.source !== frame.contentWindow || !authorUser) return;
    const { type, requestId, data } = event.data ?? {};
    if (!['blog-submit', 'blog-status'].includes(type) || !/^[a-f0-9-]{36}$/.test(requestId)) return;
    const authorFrame = frame;
    try {
      const result = type === 'blog-submit'
        ? await service.submitPublication(authorUser, data)
        : await service.publicationStatus(data?.id);
      if (frame === authorFrame) event.source.postMessage({ type: 'blog-reply', requestId, result }, location.origin);
    } catch {
      if (frame === authorFrame) event.source.postMessage({ type: 'blog-reply', requestId, failed: true }, location.origin);
    }
  });
  clearTimeout(startupTimer);
  reload.hidden = true;
  feedback.textContent = '';
  for (const button of dialog.querySelectorAll('button:not(#login-close)')) button.disabled = false;
  for (const button of oauthButtons) {
    button.addEventListener('click', async () => {
      const attempt = ++oauthRevision;
      setOAuthBusy(true);
      const hint = button.dataset.provider === 'github'
        ? '请切到 GitHub 授权窗口。若授权按钮是灰色，先把窗口切到前台，再放大窗口或滚动到按钮。'
        : '请检查浏览器打开的 Google 登录窗口。';
      feedback.textContent = hint;
      const retryTimer = setTimeout(() => {
        if (attempt !== oauthRevision) return;
        setOAuthBusy(false);
        feedback.textContent = hint + ' 如果没有看到窗口，可以点上方按钮重试。';
      }, 30_000);
      try { await service.signin(button.dataset.provider); }
      catch (error) {
        if (attempt === oauthRevision) loginError(error);
      } finally {
        clearTimeout(retryTimer);
        if (attempt === oauthRevision) setOAuthBusy(false);
      }
    });
  }
  phone.addEventListener('submit', async event => {
    event.preventDefault();
    event.submitter.disabled = true;
    feedback.textContent = '正在发送验证码…';
    try {
      confirmation = await service.phone(phone.elements.phone.value, 'phone-recaptcha');
      code.hidden = false;
      code.elements.code.focus();
      feedback.textContent = '请输入收到的短信验证码。';
    } catch (error) { loginError(error); }
    finally { event.submitter.disabled = false; }
  });
  code.addEventListener('submit', async event => {
    event.preventDefault();
    if (!confirmation) return;
    event.submitter.disabled = true;
    try { await confirmation.confirm(code.elements.code.value); }
    catch (error) { loginError(error); }
    finally { event.submitter.disabled = false; }
  });
  logout.addEventListener('click', async () => {
    try {
      await service.signout();
      setPreview(false);
    }
    catch { notice('退出未完成，请重试。'); }
  });
  service.observe(async user => {
    const revision = ++sessionRevision;
    frameObserver?.disconnect();
    panel.replaceChildren();
    frame = null;
    authorUser = null;
    showReader();
    notice('');
    toggle.hidden = true;
    open.hidden = Boolean(user);
    logout.hidden = !user;
    if (!user) return;
    feedback.textContent = '';
    dialog.close();
    confirmation = null;
    phone.reset();
    code.reset();
    code.hidden = true;
    try {
      const html = await service.workspace(user);
      if (revision !== sessionRevision || !html) return;
      authorUser = user;
      frame = document.createElement('iframe');
      frame.title = '作者工作台';
      frame.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox');
      frame.setAttribute('allow', 'clipboard-write');
      frame.srcdoc = html;
      frame.addEventListener('load', () => {
        if (revision !== sessionRevision || !frame?.contentDocument?.body) return;
        const body = frame.contentDocument.body;
        const resize = () => { frame.style.height = Math.max(480, Math.ceil(body.getBoundingClientRect().height)) + 'px'; };
        frameObserver = new ResizeObserver(resize);
        frameObserver.observe(body);
        resize();
      }, { once: true });
      panel.append(frame);
      toggle.hidden = false;
      if (!readerPreview) showAuthor();
    } catch {
      if (revision === sessionRevision) notice('暂时无法读取作者工作台。你仍可以浏览博客。');
    }
  });
} catch {
  clearTimeout(startupTimer);
  feedback.textContent = '登录服务暂时不可用。检查网络后可以重新载入博客。';
  reload.hidden = false;
}
