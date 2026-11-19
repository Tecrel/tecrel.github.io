# 在公开博客启用登录

博客仍发布在 https://tecrel.github.io/ 。读者可直接打开链接。登录入口只有配置好身份服务后才会出现在网站上。

1. 在专用于博客的 Firebase 项目中注册一个 Web App，创建默认的 Firestore 数据库，并把 `tecrel.github.io` 添加到 Authentication 的授权域名。
2. 启用 GitHub 登录。在 GitHub 注册博客专用 OAuth App，主页填 `https://tecrel.github.io/`，回调 URL 填 Firebase 在 GitHub 登录方式设置里给出的完整地址。把 OAuth App 的 Client ID 和 Client Secret 填到 Firebase 控制台。Client Secret 不进入博客仓库。
3. 需要 Google 登录时，在 Firebase 启用 Google 提供方并选择联系邮箱。需要手机登录时，在 Firebase 启用 Phone 并配置允许的短信地区和计费。
4. 在 Firebase 发布本仓库 `auth/firestore.rules`。只在博客的专用项目应用该规则，它默认拒绝其他文档的客户端访问。用 Firebase 控制台的项目管理员权限新建 `private/author-workspace`，添加字符串字段 `html`，值为私有作者仓库中运行 `node bundle.mjs` 生成的整份 `author-bundle.html`。
5. 在公开博客仓库的 Settings → Secrets and variables → Actions → Variables 创建变量 `BLOG_AUTH_SITE_CONFIG`。下面的值需要替换为实际 Firebase Web App 配置，`providers` 只填写已实际启用的登录方式。

```json
{
  "firebase": {
    "apiKey": "公共 Firebase Web API Key",
    "authDomain": "项目ID.firebaseapp.com",
    "projectId": "项目ID",
    "appId": "Web App ID"
  },
  "providers": ["github", "google", "phone"]
}
```

在 Actions 运行 **Publish blog**，随后验证匿名访问、其他 GitHub 账号、Tecrel GitHub 账号和已启用的其他登录方式。Tecrel 用 GitHub 登录默认打开工作台，可切换到读者预览。读者无法通过 Firestore 获取工作台内容。工作台原有的 GitHub 提交流程仍要求仓库写权限。
