# OpenLearning Embed Setup

When this widget is embedded in OpenLearning, the page origin is `openlearning.com`,
so relative API URLs like `/api/chat` will point to OpenLearning (and return 404).

Set the Vercel backend URL explicitly before loading the widget script (recommended). If omitted, the widget defaults to `https://premium-ai-dusky.vercel.app`:

```html
<script>
  window.PLC_API_BASE_URL = "https://premium-ai-dusky.vercel.app";
</script>
```

Then include the widget HTML/JS. The widget code uses:

- `${PLC_API_BASE_URL}/api/chat`
- `${PLC_API_BASE_URL}/api/progress`

If `PLC_API_BASE_URL` is not provided, it falls back to `https://premium-ai-dusky.vercel.app`.

## Required Vercel environment variables

- `OPENAI_API_KEY` (required)

## Optional environment variables

- `OPENLEARNING_WEBHOOK_URL` (if you want `/api/progress` to forward upstream)
- `OPENLEARNING_API_KEY` (if upstream webhook requires bearer auth)
- `OPENAI_MODEL` (defaults to `gpt-5.3-codex`)


## Troubleshooting: "Failed to fetch"

This usually means the browser blocked the network call before JSON parsing.

1. Confirm endpoint works directly:
   - `https://premium-ai-dusky.vercel.app/api/chat` (POST only)
2. Ensure `PLC_API_BASE_URL` uses HTTPS and has no trailing slash mismatch.
3. Redeploy after changing env vars.
4. In browser DevTools > Network, inspect the failing request and confirm CORS headers are present.
5. If request is blocked before network, check OpenLearning Content-Security-Policy (`connect-src`) allowlist for your Vercel domain.


## Simplest POC (Recommended): iframe the hosted widget

To avoid OpenLearning CORS/CSP issues entirely, do **not** paste the full widget JS inline.
Instead, embed the hosted widget page from Vercel:

```html
<iframe
  src="https://premium-ai-dusky.vercel.app/widget"
  style="width:100%;max-width:520px;height:760px;border:0;border-radius:12px;"
  loading="lazy"
></iframe>
```

Why this is easier for POC:
- The widget and API are on the same Vercel origin.
- Browser preflight/CORS problems from OpenLearning `srcdoc` are avoided.
- You can still update backend logic without editing OpenLearning HTML each time.
