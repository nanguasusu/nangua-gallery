interface LoginPageOptions {
  error?: string
}

export function renderLoginPage(options: LoginPageOptions = {}): string {
  const error = options.error
    ? `<p class="error">${escapeHtml(options.error)}</p>`
    : ""

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#E8F3FB" />
    <title>南瓜相册</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e8f3fb;
        color: #16324a;
        font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      @media (prefers-color-scheme: dark) {
        body { background: #0c1a26; color: #e6f2fa; }
        .card { background: #152636; }
        input { background: #1e3a52; color: #e6f2fa; }
        button { background: #7ec4f0; color: #0c1a26; }
      }
      .card {
        width: min(100% - 48px, 360px);
        background: #fff;
        border-radius: 20px;
        padding: 32px 28px;
        box-shadow: 0 1px 2px rgb(58 143 208 / 0.08), 0 8px 24px rgb(58 143 208 / 0.08);
      }
      .kicker {
        margin: 0;
        text-align: center;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.02em;
        color: #5e87a3;
      }
      h1 {
        margin: 8px 0 0;
        text-align: center;
        font-size: 22px;
        font-weight: 600;
      }
      label {
        display: block;
        margin-top: 18px;
        font-size: 13px;
        color: #5e87a3;
      }
      input {
        margin-top: 6px;
        width: 100%;
        height: 44px;
        border: 0;
        border-radius: 12px;
        background: #cde4f5;
        padding: 0 12px;
        font-size: 15px;
        outline: none;
        color: inherit;
      }
      button {
        margin-top: 24px;
        width: 100%;
        height: 44px;
        border: 0;
        border-radius: 999px;
        background: #3a8fd0;
        color: #fff;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
      }
      .error {
        margin: 16px 0 0;
        text-align: center;
        color: #d12b2b;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <form class="card" method="post" action="/api/login">
      <p class="kicker">私人相册</p>
      <h1>南瓜相册</h1>
      <label>用户名
        <input name="username" autocomplete="username" autocapitalize="off" autofocus />
      </label>
      <label>密码
        <input name="password" type="password" autocomplete="current-password" />
      </label>
      ${error}
      <button type="submit">登录</button>
    </form>
  </body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
