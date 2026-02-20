# PowerSlides Docs

Documentation website for PowerSlides. Built with React, Vite, and `@jappyjan/even-realities-ui`. Deployable to GitHub Pages.

## Develop

```bash
npx nx serve powerslides-docs
```

Runs at http://localhost:4200 (base path `/`).

## Build

```bash
npx nx build powerslides-docs
```

Output: `apps/powerslides-docs/dist/`. Configured for GitHub Pages with base path `/powerslides/`.

## Deploy to GitHub Pages

### Option 1: GitHub Actions

Create `.github/workflows/deploy-docs.yml` to build and push to `gh-pages` on push to `main`. Set Pages source to `gh-pages` branch.

### Option 2: Manual

```bash
npx nx build powerslides-docs
npx gh-pages -d apps/powerslides-docs/dist
```

### Base path

For project Pages (`https://<user>.github.io/powerslides/`), the build uses `base: '/powerslides/'`. If your repo name differs, update `vite.config.mts`.

## Images

Add `hero-presentation.jpg` to `public/` for the home page hero. See `IMAGE_PROMPTS.md` for AI generation prompts (nano banana, etc.).

## Layout

See `layout.md` for site structure, design, and implementation checklist.
