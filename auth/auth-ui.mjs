export const authMenu = `
  <button class="account-button" id="login-open" type="button">登录</button>
  <button class="account-button" id="view-toggle" type="button" hidden>读者预览</button>
  <button class="account-button" id="logout" type="button" hidden>退出</button>`;

export const authDialog = `
  <p class="account-feedback" id="account-feedback" role="status" hidden></p>
  <dialog id="login-dialog" aria-labelledby="login-heading">
    <div class="dialog-heading">
      <h2 id="login-heading">登录博客</h2>
      <button class="account-button" id="login-close" type="button">关闭</button>
    </div>
    <div class="login-options">
      <button class="read-link" type="button" data-provider="github">使用 GitHub 登录</button>
      <button class="read-link" type="button" data-provider="google" hidden>使用 Google 登录</button>
      <details id="phone-login" hidden>
        <summary>使用手机号登录</summary>
        <form id="phone-form">
          <label>手机号（含国家区号）<input name="phone" type="tel" autocomplete="tel" placeholder="+86…" required pattern="\\+[1-9][0-9]{6,14}"></label>
          <div id="phone-recaptcha"></div>
          <button class="read-link" type="submit">发送验证码</button>
        </form>
        <form id="code-form" hidden>
          <label>短信验证码<input name="code" inputmode="numeric" autocomplete="one-time-code" required pattern="[0-9]{6}" maxlength="6"></label>
          <button class="read-link" type="submit">验证并登录</button>
        </form>
      </details>
    </div>
    <p id="login-feedback" role="status" aria-live="polite"></p>
  </dialog>
  <section id="author-panel" aria-label="作者工作台" hidden></section>
  <script type="module" src="./assets/auth.js"></script>`;
