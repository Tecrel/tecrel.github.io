export const authorPage = `
  <section class="writer" aria-labelledby="writer-title">
    <header class="writer-header">
      <div><h1 id="writer-title">作者工作台</h1><p>草稿自动保存在当前浏览器。完成后，在 GitHub 提交即可发布。</p></div>
      <a class="read-link" href="https://github.com/Tecrel/tecrel.github.io/tree/main/posts">管理已发布文章</a>
    </header>
    <form id="writer-form">
      <div class="writer-meta">
        <label>标题<input name="title" placeholder="文章标题" required maxlength="150"></label>
        <label>发表日期<input name="date" type="date" required></label>
        <label>分类<input name="category" placeholder="例如：技术" required maxlength="40"></label>
        <label>文件名后缀<input name="slug" placeholder="例如：first-post" pattern="[a-z0-9]+(-[a-z0-9]+)*" required maxlength="80" aria-describedby="filename"></label>
        <label class="writer-summary">摘要<input name="description" placeholder="显示在首页和 RSS 的一两句话" required maxlength="250"></label>
      </div>
      <div class="writer-panes">
        <label class="writer-editor">正文 · Markdown<textarea name="body" placeholder="从第一句话开始…" required spellcheck="false"></textarea></label>
        <section class="writer-preview" aria-label="阅读预览">
          <h2 class="writer-label">阅读预览</h2>
          <div class="prose" id="writer-preview"></div>
        </section>
      </div>
      <div class="writer-file"><code id="filename">填写日期和文件名后缀</code><span role="status" id="save-status"></span></div>
      <div class="writer-actions">
        <button class="read-link primary" type="button" id="copy-post">复制 Markdown</button>
        <button class="read-link" type="button" id="download-post">下载 .md</button>
        <label class="import-label">导入 .md<input id="import-post" type="file" accept=".md,text/markdown,text/plain"></label>
        <button class="read-link" type="button" id="clear-post">清空草稿</button>
      </div>
    </form>
    <section class="writer-publish" aria-label="发布">
      <p>复制 Markdown 后，打开 GitHub 的编辑页，粘贴内容并提交到 <code>main</code>。</p>
      <a class="read-link" id="github-editor" href="https://github.com/Tecrel/tecrel.github.io/new/main/posts" target="_blank" rel="noopener noreferrer">在 GitHub 新建文章</a>
      <a class="read-link" id="github-update" target="_blank" rel="noopener noreferrer" hidden>修改同名已发布文章</a>
    </section>
  </section>
  <script type="module" src="./assets/author.js"></script>`;
