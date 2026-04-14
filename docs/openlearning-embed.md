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
- `OPENLEARNING_ORIGIN` (recommended; set to OpenLearning + your own host origins)

## Optional environment variables

- `OPENLEARNING_WEBHOOK_URL` (if you want `/api/progress` to forward upstream)
- `OPENLEARNING_API_KEY` (if upstream webhook requires bearer auth)
- `OPENAI_MODEL` (defaults to `gpt-5.3-codex`)
