# Tecrel Notes

属于 Tecrel 的个人博客。独立项目，无 npm 第三方依赖。LYNNING 只是文章与项目之一。

## 本地预览

安装 Node.js 22+ 和 Python 3 后：

```sh
node build.mjs
python -m http.server 4173 --directory dist
```

打开 http://localhost:4173 。

## 写文章

在 posts 新建 `YYYY-MM-DD-slug.md`，按现有示例填写 title、date、category、description，接着独占一行 `---`，下面写正文。当前支持段落和二级标题 `##`；HTML 会转义，暂不支持其他 Markdown 语法。首页自动排序、分类和搜索。所有示例需要作者审阅后再正式发表。

## GitHub Pages

把本文件夹的内容作为**独立仓库根目录**上传至 `Tecrel/tecrel.github.io`，不要上传整个 LYNNING 工程。默认分支为 main。在仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions，然后在 Actions 里运行 Publish blog。工作流将构建并发布 dist。预计地址为 https://tecrel.github.io/ ，只有 GitHub 部署成功后该地址才可用。

以后提交文章会自动更新网站。发布到项目子路径时页面相对链接仍可用，但需要修改 build.mjs 中 RSS 的 base。

## 设计

首页采用纸白、墨黑与朱红配色，以衬线刊头和精选文章开场。正文使用单栏排版。视觉参考包括 [The Paper Portfolio](https://www.niccolomiranda.com/) 的刊头与网格，以及 [Cine City](https://www.cinecity.nyc/) 的封面和章节导览。射电望远镜封面由 ImageGen 生成，WebP 文件保存在 assets 中。

站点不依赖外部字体或图片服务，支持移动端、键盘导航与减少动态偏好。文章为建站示例。
