# PowerSlides

PowerSlides is a special web app that runs inside the Even Realities app to control the Even Realities G2 via the Even Better SDK. It also includes a browser extension and server to pair with Google Slides and relay commands. It consists of:

- `apps/powerslides` – the Even Realities web app UI (connects via pairing code)
- `apps/powerslides-browser-extension` – Chrome extension that reads slide state
- `apps/powerslides-server` – WebSocket relay/server for pairing + commands
- `libs/powerslides-shared` – shared types and pairing utilities

## Quick start

1) Install dependencies:

```
npm install
```

2) Start the server:

```
npx nx serve powerslides-server
```

3) Run the web app (hosted inside the Even Realities app):

```
npx nx dev powerslides
```

4) Build the browser extension and load it in Chrome:

```
npx nx build powerslides-browser-extension
```

Then load `dist/apps/powerslides-browser-extension` as an unpacked extension.

## Configuration

The web app needs a WebSocket URL. Copy `.env.example` to `.env` and set:

```
VITE_WEBSOCKET_URL=ws://localhost:4001
```

The server listens on `PORT` (defaults to `4001`).

## How it works

1) Open a Google Slides deck and start a session from the extension.
2) The extension generates a pairing code (slide id + password).
3) The web app runs inside Even Realities and connects to the server with the pairing code.
4) The extension streams slide state to the server and receives commands.

## Development notes

- Use `npx nx graph` to explore project relationships.
- Each app has its own README with project-specific details.