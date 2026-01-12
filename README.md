# slack-codex-bridge

A lightweight bridge between Slack and Codex CLI. It receives Slack mentions or slash commands, forwards them to Codex, and formats the response back for Slack. The goal is a minimal, dependable bridge first — a bot is just one possible use.

Project website: https://usuginus.github.io/slack-codex-bridge/

<p align="center">
  <img src="https://github.com/user-attachments/assets/b5a278a8-3fc0-4879-a4b5-d0d749aa5bef" alt="logo banner">
</p>

## What this is

- Slack → Codex CLI → Slack response pipeline
- Simple prompt + formatting layer
- Optional Slack context enrichment

## Features

- Mention replies (concise, language-matched)
- Custom slash command flow (you define the prompt)
- Slack-friendly formatting
- Optional Slack context enrichment (channel history, members, user profile, thread)

<img width="681" height="103" alt="image" src="https://github.com/user-attachments/assets/f2e1c997-d461-4650-bf03-b761414f2df8" />

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

Optional (Codex CLI tuning):

- `CODEX_WEB_SEARCH=0` disable web search
- `CODEX_MODEL=gpt-5.2`
- `CODEX_REASONING_EFFORT=low`

Optional (runtime):

- `PLANNER_REPO_DIR=/path/to/repo`
- `PLANNER_DEBUG=1` verbose failures
- `PORT=8080`

See `.env.sample` for examples.

## Slack App Setup

- Enable Socket Mode
- Slash Commands: define your own command (example: `/hangout`)
- Event Subscriptions: `app_mention`
- Bot Token Scopes:
  - `chat:write`
  - `conversations:read`
  - `channels:history`
  - `users:read`

## Architecture

```
src/
  app/                 # Slack entrypoint
  services/            # Prompting + formatting
  integrations/        # Slack API + Codex CLI + sanitizers
```

## Development

```bash
npm run dev
```

## VM / Server Notes

This project runs fine on a VM or a small server as long as Node.js, Codex CLI, and the required Slack tokens are available. If you use systemd, ensure the service PATH includes the `codex` binary and the `.env` file is readable by the service user.

## Troubleshooting

- `codex` not found: ensure Codex CLI is installed and on PATH
- timeouts: reduce prompt size or increase the timeout
- slash command fails: verify the command name matches your Slack app config

## License

MIT License
