# codex-echo-in-slack

Lightweight Slack bot powered by Codex. It replies to mentions and offers a `/hangout` command for quick meetup suggestions.

<img width="681" height="103" alt="image" src="https://github.com/user-attachments/assets/f2e1c997-d461-4650-bf03-b761414f2df8" />

## Features

- Mention replies (concise, language-matched)
- `/hangout` suggestions with 3 picks
- Slack-friendly formatting
- Optional Slack context enrichment (channel history, members, user profile, thread)

## Requirements

- Node.js (LTS recommended)
- npm
- Codex CLI (`codex` available on PATH)
- Slack App tokens (`SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`)

## Quick Start

```bash
npm install
cp .env.sample .env
npm run build
npm start
```

## Configuration

Required:

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `SLACK_SIGNING_SECRET`
- `OPENAI_API_KEY`

Optional:

- `CODEX_WEB_SEARCH=0` disable web search
- `CODEX_MODEL=gpt-4.1-mini`
- `CODEX_REASONING_EFFORT=low`
- `PLANNER_DEBUG=1` verbose failures

See `.env.sample` for examples.

## Slack App Setup

- Enable Socket Mode
- Slash Commands: `/hangout`
- Event Subscriptions: `app_mention`
- Bot Token Scopes:
  - `chat:write`
  - `conversations:read`
  - `channels:history`
  - `users:read`

## Project Structure

```
src/
  app/                 # Slack entrypoint
  services/            # Business logic (hangout, mentions)
  integrations/        # Slack API + Codex CLI + sanitizers
```

## Development

```bash
npm run dev
```

## Troubleshooting

- `codex` not found: ensure Codex CLI is installed and on PATH
- timeouts: reduce prompt size or increase timeout
- slash command fails: check Slack command name matches `/hangout`

## License

MIT
