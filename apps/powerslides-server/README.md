# PowerSlides Server

Express + WebSocket relay that handles pairing and forwards slide state/commands between the extension and the web app.

## Start

```
npx nx serve powerslides-server
```

## Docker

Build from the repo root:

```bash
docker build -f apps/powerslides-server/Dockerfile -t powerslides-server .
```

Run:

```bash
docker run -p 4001:4001 powerslides-server
```

## Configuration

- `PORT` (default `4001`)
- Health check at `GET /health`
