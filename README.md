# slack-codex-bridge

A lightweight bridge between Slack and Codex CLI. It receives Slack mentions or slash commands, forwards them to Codex, and posts the response directly to Slack. The goal is a minimal, dependable bridge first — a bot is just one possible use.

Project website: https://usuginus.github.io/slack-codex-bridge/

<p align="center">
  <img src="https://github.com/user-attachments/assets/b5a278a8-3fc0-4879-a4b5-d0d749aa5bef" alt="logo banner">
</p>

## What this is

- Slack → Codex CLI → Slack response pipeline
- Prompts instruct Codex to output Slack mrkdwn directly — no post-processing
- Optional Slack context enrichment

## Features

- Mention replies (concise, language-matched)
- Slash commands with named or positional parameters
- Codex outputs Slack mrkdwn directly (no formatting layer)
- Slack context enrichment (channel history, members, user profile, thread)
- Input truncation and prompt length limits for safety
- Graceful shutdown (SIGTERM/SIGINT)

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

## Slash Command Usage

The `/hangout` command supports both positional and named parameters:

```
/hangout Downtown 40 4 7:30pm
/hangout area:Downtown budget:40 people:4 time:7:30pm
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

TypeScript strict mode (`strict: true`, ES2022, NodeNext).

```
src/
  app/
    index.ts                  # Slack Bolt entrypoint (Socket Mode)
  services/
    hangout.ts                # /hangout command service
    mention.ts                # @mention response service
    diagnostics.ts            # Shared error diagnostics
  integrations/
    codex_client.ts           # Codex CLI process spawner
    slack_api.ts              # Slack context collector
    slack_formatters.ts       # Bot mention stripping
```

## Development

```bash
npm run dev               # start with ts-node
npm test                  # run vitest
npx tsc --noEmit          # type check
```

## VM / Server Notes

This project runs fine on a VM or a small server as long as Node.js, Codex CLI, and the required Slack tokens are available. If you use systemd, ensure the service PATH includes the `codex` binary and the `.env` file is readable by the service user.

## Troubleshooting

- `codex` not found: ensure Codex CLI is installed and on PATH
- timeouts: reduce prompt size or increase the timeout
- slash command fails: verify the command name matches your Slack app config

## License

MIT License
