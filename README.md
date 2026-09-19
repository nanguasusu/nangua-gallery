# Nangua Gallery

私人相册 / 图床管理 Web 应用。风格接近 Apple Photos：网格、Lightbox、相册、收藏、回收站。

现有 Cloudflare R2 图床对象 **不会被迁移、重命名或覆盖**。公开 URL 继续有效。

- **R2**：真实图片文件
- **D1**：metadata（文件名、收藏、相册关系、删除状态、搜索字段）

新上传只写入 `uploads/YYYY/MM/<uuid>.<ext>`。普通删除是软删除（回收站）。只有 `ENABLE_DELETE=true` 且图片已在回收站时，才允许永久删除 R2 对象。

## 技术栈

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, PWA
- Backend: Cloudflare Workers, Hono, Drizzle ORM
- Storage: Cloudflare R2
- Metadata: Cloudflare D1
- Thumbnails: Cloudflare Images Binding（失败时回退原图）

## 安装

需要 Node.js 20+。

```bash
npm install
npx wrangler login
```

## 本地运行

```bash
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)。当前 Worker 使用 `remote: true`，会读写绑定的生产 bucket `nanguaimg`。上传会创建新对象，不会改旧 key。

只跑 API：

```bash
npm run dev:worker
```

## Cloudflare / R2 Binding

`apps/worker/wrangler.jsonc`：

```jsonc
"r2_buckets": [
  {
    "binding": "BUCKET",
    "bucket_name": "nanguaimg",
    "remote": true
  }
]
```

不要把 Access Key / Secret Key 写进前端。

## D1 setup

D1 是 metadata layer。**不会移动、重命名或覆盖现有 R2 对象。**

### 1. 创建 database（已创建可跳过）

```bash
npx wrangler d1 create nangua-gallery
```

把返回的 `database_id` 写进 `apps/worker/wrangler.jsonc`：

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "nangua-gallery",
    "database_id": "<database_id>",
    "migrations_dir": "src/db/migrations"
  }
]
```

### 2. 生成 migration

Schema 在 `apps/worker/src/db/schema.ts`。改表结构后：

```bash
npm run db:generate
```

会用 drizzle-kit 在 `apps/worker/src/db/migrations/` 生成 SQL。不要手写一堆不可追踪的 SQL。

### 3. 本地执行 migration

```bash
npm run db:migrate:local
```

对应：

```bash
npx wrangler d1 migrations apply nangua-gallery --local
```

### 4. Remote D1 执行 migration

```bash
npm run db:migrate:remote
```

对应：

```bash
npx wrangler d1 migrations apply nangua-gallery --remote
```

### 5. 同步已有 R2 图片

登录后打开 **设置**，点 **同步 R2**。

或：

```http
POST /api/admin/sync
```

需要已登录 session，或 `Authorization: Bearer <ADMIN_TOKEN>`。

同步会分页扫描 R2（默认每页 100），把缺失的 `object_key` 插入 `images`。已存在的记录跳过。可重复执行，不会产生重复行，也不会改 object key。缺少 `width` / `height` 的记录会读取文件头（Range 前 256 KB）补齐，不会下载整张原图。

## 环境变量

| 变量 | 作用 |
| --- | --- |
| `PUBLIC_IMAGE_BASE_URL` | 现有图床域名，例如 `https://img.nnann.cc` |
| `GALLERY_USERNAME` | 登录用户名（Wrangler secret） |
| `GALLERY_PASSWORD` | 登录密码（Wrangler secret） |
| `SESSION_SECRET` | 会话签名密钥（Wrangler secret） |
| `ENABLE_DELETE` | 默认 `false`。只有设为 `true` 才允许永久删除（R2 delete） |
| `ADMIN_TOKEN` | 可选。管理 API 的 Bearer token |

本地复制 `apps/worker/.dev.vars.example` 为 `.dev.vars`。生产：

```bash
npx wrangler secret put GALLERY_USERNAME
npx wrangler secret put GALLERY_PASSWORD
npx wrangler secret put SESSION_SECRET
```

启用永久删除（会删除 R2 对象，可能打断已引用的图片链接）。**不要拿历史生产图片做永久删除测试。**

```bash
npx wrangler secret put ENABLE_DELETE
# 值为 true
```

或在 `wrangler.jsonc` 的 `vars` 里设置 `"ENABLE_DELETE": "true"`。默认保持 `"false"`。

可选：

```bash
npx wrangler secret put ADMIN_TOKEN
```

## 开发命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 前端 + Worker |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | 构建前端并检查 Worker |
| `npm run db:generate` | 根据 Drizzle schema 生成 migration |
| `npm run db:migrate:local` | 把 migration 应用到本地 D1 |
| `npm run db:migrate:remote` | 把 migration 应用到远程 D1 |
| `npm run deploy` | 构建并部署到 Cloudflare |

## GitHub 自动部署

现有 Worker `nangua-gallery` 继续用，不要再新建一个。推送到 GitHub 的 `main` 后，GitHub Actions 会构建并 `wrangler deploy` 到这个 Worker。R2 / D1 / 登录 secret 都还在 Cloudflare 上。

一次性配置：

1. 打开 [Cloudflare API tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Create Token → 用 **Edit Cloudflare Workers** 模板（需要 Workers 和 D1 权限）
3. 打开 GitHub 仓库 **Settings → Secrets and variables → Actions**
4. 新增 secret：`CLOUDFLARE_API_TOKEN` = 刚才生成的 token

之后：

```bash
git push origin main
```

到仓库的 **Actions** 页看部署是否成功。改表结构时在本地跑 `npm run db:migrate:remote`，GitHub 自动部署只更新 Worker 代码。

## API

所有 `/api/images*`、`/api/albums*`、`/api/image*` 都需要登录 cookie。`POST /api/admin/sync` 需要登录或 `ADMIN_TOKEN`。

列表响应继续使用 `{ items, cursor, hasMore }`。错误继续使用 `{ error: { code, message } }`。

### `GET /api/images`

从 D1 查询，不再每次 `R2.list()`。

Query：

- `cursor` / `limit`（默认 50，最大 100）
- `search`：`original_name` 和 `object_key` 的 LIKE（会转义 `%` `_`）
- `favorite=true`
- `album=<albumId>`
- `deleted=true`（回收站；默认 `deleted_at IS NULL`）

排序：`coalesce(uploaded_at, created_at) DESC`。

### `POST /api/images`

`multipart/form-data`，字段 `file`，可选 `path`（目录前缀）。

成功后：R2 put 新 UUID key，再插入 D1。如果 D1 失败，会补偿删除**刚刚生成的新对象**，不会动历史文件。

### `PATCH /api/images/:id`

```json
{ "favorite": true }
```

### `POST /api/images/favorite`

```json
{ "imageIds": ["..."], "favorite": true }
```

### `POST /api/images/trash`

软删除。只写 `deleted_at`，不删 R2。

旧接口 `POST /api/images/delete` / `DELETE /api/images` 现在也是移入回收站。

### `POST /api/images/restore`

将 `deleted_at` 设为 `NULL`。

### `POST /api/images/permanent-delete`

仅回收站中的图片。流程：确认 `deleted_at IS NOT NULL` → 删除 R2 object → 删除 `album_images` → 删除 `images` 行。受 `ENABLE_DELETE` 保护。

### Albums

- `GET /api/albums`
- `POST /api/albums`
- `GET /api/albums/:id`
- `PATCH /api/albums/:id`
- `DELETE /api/albums/:id`（只删相册和关系，不删图片 / R2）
- `GET /api/albums/:id/images`
- `POST /api/albums/:id/images` `{ "imageIds": [] }`（重复加入忽略）
- `DELETE /api/albums/:id/images` `{ "imageIds": [] }`（只删关系）

### `POST /api/admin/sync`

幂等扫描 R2，补齐 D1 metadata。

```json
{
  "scanned": 1250,
  "inserted": 42,
  "skipped": 1208,
  "failed": 0,
  "sized": 38,
  "hasMore": false
}
```

### `GET /api/image/:key?w=&h=&fit=&quality=`

缩略图代理。登录后再查 Cache API（不含 Cookie），命中则直接返回。未命中时用 Cloudflare Images Binding 转成 WebP，失败则返回 R2 原图。浏览器可缓存（`private, max-age=31536000`）。`/api/images` 等 JSON 接口仍然 `no-store`。

### `GET /api/config`

`{ "enableDelete": false }`（现在表示永久删除是否开启）

## 当前已实现（Phase 1 + Phase 2 + Phase 3 + 体验优化）

- 只读列出图片，cursor 分页 + 无限滚动
- 响应式网格、Lightbox、Dark Mode、登录墙
- 上传、拖拽上传、粘贴截图、最多 3 路并发、真实 XHR 进度
- Gallery 缩略图 + Lightbox 原图；缩略图在鉴权后走 Cache API + 浏览器缓存
- 多选、批量 Copy / Markdown / HTML
- D1 metadata、R2 → D1 幂等同步（含宽高补齐）
- 相册（多对多）、收藏、搜索、指定相册封面
- 回收站：软删除、恢复、永久删除（需二次确认）
- 上传成功后写入 D1（含宽高）并插入列表
- 照片按年/月分组，月份标题吸顶

## 已知限制

- 回收站不会自动清空。30 天清理仍未做
- 没有全文搜索 / EXIF / 人脸
- 缩略图依赖 Images Binding；若账户或运行时不支持，会回退加载原图
- 网格仍是 1:1，尚未做瀑布流（宽高已写入，后续可用来排版）
- 单用户登录墙
- D1 有记录但 R2 对象缺失时，卡片显示「图片缺失」
- 永久删除默认关闭；不要对历史生产对象做删除测试

## 后续建议

- 回收站 30 天自动清理
- 标签、拍摄时间（EXIF）
- 原图缺失的 metadata 修复工具
- 瀑布流布局
- 网格虚拟列表（图片过千张时）
