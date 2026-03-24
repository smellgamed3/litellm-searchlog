# LiteLLM SearchLog

A web management interface for searching and inspecting LiteLLM Proxy spend logs.

## Features

- 🔌 **Multi-instance support** — connect to multiple LiteLLM Proxy instances
- 🔍 **Log search** — filter by conversation ID, date range, user ID, or request ID
- 🔐 **Secure** — admin API keys are stored server-side and never exposed to the browser
- 📊 **Detailed views** — expandable log entries with formatted JSON for messages, responses, and metadata
- 💰 **Spend tracking** — view tokens used and cost per request and in aggregate

## Getting Started

### Prerequisites

- Node.js 18+
- A running [LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/quick_start) instance with an admin API key

### Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

1. Navigate to **Instances** → **Add Instance**
2. Enter a name, the base URL of your LiteLLM Proxy, and your admin API key
3. Instance configurations are stored in `instances.json` on the server (excluded from git)

### Enabling Prompt/Response Storage in LiteLLM

To see request messages and responses in the log detail view, enable storage in your LiteLLM `proxy_config.yaml`:

```yaml
general_settings:
  store_prompts_in_spend_logs: true
```

Or enable it in the Admin UI → Logs → Settings.

### Passing `conversation_id`

To group requests by conversation, include `conversation_id` in the `metadata` field of your LLM requests:

```json
{
  "model": "gpt-4",
  "messages": [...],
  "metadata": {
    "conversation_id": "my-conv-123"
  }
}
```

## Architecture

```
Browser (Next.js App Router)
  └── /search          — Log search UI
  └── /instances       — Instance management UI
  └── /api/instances   — CRUD for LiteLLM instance configs (server-side)
  └── /api/logs        — Proxy to LiteLLM /spend/logs (hides admin key)
```

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + custom shadcn/ui-style components
- **Storage**: `instances.json` file (server-side, gitignored)

## Production Deployment

```bash
npm run build
npm start
```

Or deploy to Vercel / Docker. The `instances.json` file is created automatically when you add your first instance.

> ⚠️ In production, consider using a database or encrypted secrets manager for storing instance configurations instead of a plain JSON file.
