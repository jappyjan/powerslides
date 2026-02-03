# PowerSlides Browser Extension

Chrome extension that reads Google Slides state and relays it to the server. It also receives commands from the web app to advance slides or start presenting.

## Build

```
npx nx build powerslides-browser-extension
```

Load `dist/apps/powerslides-browser-extension` as an unpacked extension in Chrome.

## Usage

1) Open a Google Slides deck.
2) Start a session from the extension UI.
3) Share the pairing code with the web app.
