// middleware/notFound.js
// CommonJS style to match your other middleware
const notFound = (req, res, next) => {
  const url = req.originalUrl || req.url;
  const acceptsHtml = req.accepts('html');
  const acceptsJson = req.accepts('json');

  // Log optional: helpful during dev
  // console.warn(`404 - Not Found: ${url}`);

  if (acceptsHtml) {
    // Simple, responsive HTML page — change branding/colors as needed
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>404 — Not Found</title>
<style>
  :root{--bg:#fafafa;--card:#fff;--muted:#6b7280;--accent:#03C03C}
  html,body{height:100%;margin:0;font-family:Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;}
  body{display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,var(--bg),#f6f8fa);padding:24px;}
  .card{background:var(--card);border-radius:12px;box-shadow:0 8px 30px rgba(2,6,23,0.08);max-width:820px;width:100%;padding:28px;display:flex;gap:24px;align-items:center;}
  .badge{background:var(--accent);color:#fff;padding:10px 14px;border-radius:10px;font-weight:700;}
  h1{margin:0;font-size:20px}
  p{margin:6px 0;color:var(--muted)}
  .meta{margin-top:8px;font-size:13px;color:#9aa0a6}
  .actions{margin-left:auto}
  a.btn{display:inline-block;padding:10px 14px;border-radius:8px;text-decoration:none;border:1px solid #e6eef0;background:transparent;color:#111;font-weight:600}
  a.btn.primary{background:var(--accent);color:#fff;border-color:transparent}
  @media (max-width:640px){.card{flex-direction:column;align-items:flex-start}}
</style>
</head>
<body>
  <div class="card" role="document" aria-labelledby="title">
    <div style="display:flex;align-items:center;gap:16px">
      <div class="badge" aria-hidden="true">404</div>
      <div>
        <h1 id="title">Page not found</h1>
        <p>We couldn't find <strong>${escapeHtml(url)}</strong></p>
        <div class="meta">If you think this is an error, check the URL or return home.</div>
      </div>
    </div>

    <div class="actions" role="group" aria-label="actions">
      <a href="/" class="btn primary">Go home</a>
      <a href="mailto:support@example.com" class="btn" style="margin-left:8px">Contact support</a>
    </div>
  </div>
</body>
</html>`;

    return res.status(404).send(html);
  }

  if (acceptsJson) {
    return res.status(404).json({
      status: "error",
      message: "Not Found",
      path: url,
    });
  }

  // fallback plain text
  res.status(404).type('txt').send(`404 Not Found: ${url}`);
};

// Small helper to avoid XSS when injecting the URL into HTML
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = notFound;
