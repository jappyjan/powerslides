# PowerSlides Web App

Special web app that runs inside the Even Realities app to control the Even Realities G2 via the Even Better SDK. It connects to the WebSocket server using a 12-character pairing code created by the browser extension.

## Start

```
npx nx dev powerslides
```

## Configuration

Set the WebSocket URL in `.env` at the repo root:

```
VITE_WEBSOCKET_URL=ws://localhost:4001
```

## Usage

1) Start the server and extension session.
2) Enter the pairing code in the app (running inside Even Realities).
3) Use the controls to advance slides or start presentation mode.
