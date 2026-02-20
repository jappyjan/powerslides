# PowerSlides Browser Extension

Chrome extension that reads Google Slides state and relays it to the server. It also receives commands from the web app to advance slides or start presenting.

## Server URL

Configure the WebSocket server URL via `VITE_WEBSOCKET_URL`. Default: `wss://powerslides.apps.janjaap.de`

```bash
# Production (default)
# Uses wss://powerslides.apps.janjaap.de

# Local development
VITE_WEBSOCKET_URL=ws://localhost:4001 nx build powerslides-browser-extension
```

Copy `.env.example` to `.env` and set `VITE_WEBSOCKET_URL` as needed.

## Build

```bash
# Generate icons (first time or when changing icons)
npm run generate-icons

# Build extension
npx nx build powerslides-browser-extension
```

Load `dist/` as an unpacked extension in Chrome (chrome://extensions → Load unpacked).

## Chrome Web Store

```bash
npx nx run powerslides-browser-extension:bundle
```

Produces `powerslides-extension.zip` ready for Chrome Web Store upload.

## Usage

1) Open a Google Slides deck.
2) Start a session from the extension UI.
3) Share the pairing code with the web app.
