# OpenLearning Embed Setup

When this widget is embedded in OpenLearning, the page origin is `openlearning.com`,
so relative API URLs like `/api/chat` will point to OpenLearning (and return 404).

Set the Vercel backend URL explicitly before loading the widget script:

```html
<script>
  window.PLC_API_BASE_URL = "https://YOUR-PROJECT.vercel.app";
</script>
```

Then include the widget HTML/JS. The widget code uses:

- `${PLC_API_BASE_URL}/api/chat`
- `${PLC_API_BASE_URL}/api/progress`

If `PLC_API_BASE_URL` is not provided, it falls back to `window.location.origin` for local/same-origin testing.
