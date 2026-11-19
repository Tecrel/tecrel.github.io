# Tecrel Notes

属于 Tecrel 的个人博客。LYNNING 只是文章与项目之一。

## 本地预览

安装 Node.js 22+ 和 Python 3 后：

```sh
npm ci --ignore-scripts
node build.mjs
python -m http.server 4173 --directory dist
```

打开 http://localhost:4173 。

## 写文章

将 Markdown 文章提交到本仓库的 `main` 分支后，GitHub Actions 会更新公开博客。

也可以在 `posts` 手动新建 `YYYY-MM-DD-slug.md`，逐行填写 `title: ...`、`date: ...`、`category: ...` 和 `description: ...`，接着独占一行 `---`，下面写正文。正文支持 CommonMark、表格、删除线、任务列表和脚注。正文里的独占横线前加一个空行，可把它与紧贴上一行的 Setext 标题区分。第一篇文章提交后，首页会自动出现精选和文章索引。

## GitHub Pages

把本文件夹的内容作为**独立仓库根目录**上传至 `Tecrel/tecrel.github.io`，不要上传整个 LYNNING 工程。默认分支为 main。在仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions，然后在 Actions 里运行 Publish blog。工作流将构建并发布 dist。预计地址为 https://tecrel.github.io/ ，只有 GitHub 部署成功后该地址才可用。

以后提交文章会自动更新网站。发布到项目子路径时页面相对链接仍可用，但需要修改 build.mjs 中 RSS 的 base。

## 作者工作台发布

工作台复用 Firebase 的 GitHub 登录，由 `auth/firestore.rules` 限制 Tecrel 账号创建发布任务。`Publish queued articles` 定时处理任务，也可在 Actions 手动运行。它使用本仓库的 `GITHUB_TOKEN` 提交 `posts/`，并在 Pages 部署成功后更新任务状态。

启用工作流需设置 `BLOG_PUBLISH_PROVIDER` 和 `BLOG_PUBLISH_ACCOUNT` 两个仓库变量。前者是 Google Cloud Workload Identity Provider 的完整资源名称，后者是发布服务账号邮箱。Provider 只认可本仓库 `main` 分支上的 `publish-queue.yml`。服务账号需要 Firestore 查询、读取和更新权限。先手动运行工作流验证连接，再部署 Firestore 规则与作者工作台 bundle。

即时触发使用 `auth/publish-trigger.wrangler.jsonc` 部署的 Cloudflare Worker。GitHub App 安装范围只选 `Tecrel/tecrel.github.io`，仓库权限设为 Actions 读写。把 App 的 ID、安装 ID 和私钥作为 Worker Secrets，验证 Worker 后将它的 HTTPS 来源填入仓库变量 `BLOG_PUBLISH_TRIGGER_URL`，再重新部署页面。Worker 通过 Firestore 规则验证登录会话，仅查询任务状态，并触发 `main` 上的发布工作流。定时工作流作为即时触发失败时的回退。

## 设计

首页采用纸白、墨黑与朱红配色，以衬线刊头和精选文章开场。正文使用单栏排版。视觉参考包括 [The Paper Portfolio](https://www.niccolomiranda.com/) 的刊头与网格，以及 [Cine City](https://www.cinecity.nyc/) 的封面和章节导览。射电望远镜封面由 ImageGen 生成，WebP 文件保存在 assets 中。

站点不依赖外部字体或图片服务，支持移动端、键盘导航与减少动态偏好。
