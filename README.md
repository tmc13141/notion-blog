# Notion-Powered Static Blog

[![Next.js](https://img.shields.io/badge/Next.js-15.0.0-000000?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

基于 Next.js App Router 和 Notion API 构建的高性能静态博客，Notion 作为内容管理系统，支持增量静态再生（ISR）和丰富的交互体验。

[示例网站](https://www.dukda.com)

## 特性亮点

- 基于 Notion 的零成本内容管理
- 自动增量静态生成（ISR）
- 暗黑模式支持
- 响应式设计
- 简约风格
- 内置 SEO 优化

## 技术栈

- ​**​ 框架 ​**​: Next.js 15 (App Router)
- ​**​ 数据层 ​**​: Notion API
- ​**​ 样式 ​**​: Tailwind CSS
- ​**​ 图标 ​**​: Lucide
- ​**​ 组件库 ​**​: Shadcn UI
- ​**​ 动画 ​**​: Tailwindcss-Animate

## 部署

1. 复制[模板数据库](https://zephyrrr.notion.site/1be1f833110780d98383fc637676cee8?v=1be1f833110780839e62000c8c92f8e3&pvs=4)
2. 修改数据库权限为公开

3. 获取 Notion 数据库 ID：

   - 复制 URL 中 `?v=` 之前的部分（如：`1be1f833110780d98383fc637676cee8`）

4. 配置环境变量或者直接修改 `blog.config.ts`

   ```typescript
   NOTION_PAGE_ID=你的数据库ID

   // blog.config.ts
   NOTION_PAGE_ID:
      process.env.NOTION_PAGE_ID || "修改成你的数据库ID",
   ```

5. 推荐使用 Vercel 部署，简单方便

   - Fork 本项目
   - 注册 Vercel 账号
   - 然后连接你的 GitHub 账号
   - 然后点击 `New` 按钮，选择 `Import Git Repository`
   - 配置环境变量 `NOTION_PAGE_ID`
   - 选择你的项目，然后点击 `Deploy` 按钮
   - 等待部署完成

6. 也推荐使用 Cloudflare Workers 部署（免费额度更慷慨），但是想要自定义域名的话，需要把域名，托管在 Cloudflare 上：

   - Fork 本项目
   - 注册 Cloudflare 账号
   - 前往 `Workers & Pages` 页面，点击`Create Application`
   - 选择 `Continue with Github` 并授权
   - 选择 `Import from GitHub` 并选择你的仓库
   - 填写相应字段
     - `Project name`: notion-blog (必须和 wrangler.json 中的 name 一致)
     - `Build command`: 删除掉，留空
     - `Deploy command`：`pnpm run deploy`
     - 展开`Advanced`选项，配置构建时环境变量
       - `Variable name`: `NOTION_PAGE_ID`
       - `Variable value`: 你的 Notion 数据库 ID
     - 注意：在 Cloudflare 中我们使用了 KV 作为缓存，所以它会在每次部署时自动创建一个 KV 空间，所以你不需要手动创建 KV 空间。
   - 点击 `Deploy`
   - 前往部署好的仪表盘页面的`Settings` -> `Variables and Secrets`, 新增环境变量 `NOTION_PAGE_ID`，再次部署
   - 关于自定义域名有两种设置方式
     - 方式一：在`Settings` -> `Domains & Routes` 中添加域名，然后点击 `Add` 按钮
     - 方式二：在`wrangler.json`配置文件里的修改`routes`配置项，注意要把所有的注释`//`去掉
     ```json
     "routes": [
       {
         "pattern": "www.yourdomain.com",
         "custom_domain": true
       }
     ]
     ```

7. 也可以使用 Docker 部署，已经提供了`Dockerfile`

   - 注意如果使用环境变量，建议创建一个`.env`文件后，再进行镜像 build, 不然无法在 build 时获取到环境变量
   - 示例 docker-compose.yml 文件如下：

     ```yaml
     version: "3"

     services:
     blog:
       build:
         context: .
       ports:
         - 3000:3000
     ```

## 配置项

可以直接在 Notion 里进行大部分配置，除了 `NOTION_PAGE_ID` 和 `NEXT_REVALIDATE_SECONDS` 需要手动配置

- `NOTION_PAGE_ID` 是你的 Notion 数据库 ID
- `NEXT_REVALIDATE_SECONDS` 是 ISR 的缓存时间，默认是 60 秒，通俗的讲就是每隔 60 秒会重新生成一次静态页面

其余 Notion 上的配置项都挺好理解的，这里就不赘述了

## 缓存机制说明

为了提供更快的访问速度和更低的服务器成本，博客使用了多层缓存机制。以下是一些你可能会注意到的行为：

### 内容更新延迟

当你在 Notion 中修改文章后，网站上的内容**不会立即更新**。默认情况下，需要等待约 **1 分钟**（由 `NEXT_REVALIDATE_SECONDS` 控制）后，下一次访问才会看到最新内容。

这是正常现象，不是 Bug ✅

### 新文章可见性

当你在 Notion 中新增一篇文章：

1. **文章页面**：新文章几乎可以**立即访问**（通过直接链接）
2. **文章列表**：需要等待缓存刷新（约 1 分钟）后才会显示在首页和列表页
3. **搜索功能**：新文章可以**立即通过标题和标签搜索到**，但全文搜索需要等待缓存刷新

### 搜索功能说明

博客的搜索功能会预先建立搜索索引以提供快速响应：

- **可搜索内容**：文章标题、标签、摘要、正文内容
- **首次搜索**：部署后的第一次搜索可能稍慢（约 1-2 秒），因为需要构建索引
- **后续搜索**：毫秒级响应

### 如何加快更新？

如果你需要立即看到更新，可以：

1. **重新部署**：在 Vercel/Cloudflare 后台手动触发重新部署
2. **调整缓存时间**：将 `NEXT_REVALIDATE_SECONDS` 设置为更小的值（注意：可能增加 API 调用次数）

## 感谢

借鉴了以下的优秀项目：

- [Shiro](https://github.com/Innei/Shiro)
- [Notion Next](https://github.com/tangly1024/NotionNext)
