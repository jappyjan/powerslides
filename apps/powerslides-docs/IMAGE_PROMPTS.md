# Image Prompts for PowerSlides Docs

Use these prompts with **nano banana** (or any AI image generator) to create assets for the docs site. Save generated images to `apps/powerslides-docs/public/`.

---

## 1. Hero image — `hero-presentation.jpg`

**Purpose:** Main hero on the home page. Conveys "presenting with a smartwatch."

**Prompt:**
```
Professional presenter at a conference, confident pose, wearing a sleek smartwatch on wrist, 
large presentation screen with slides in background, soft natural lighting, 
modern minimalist style, warm teal and slate color palette, 
photorealistic, high quality, 16:9 aspect ratio
```

**Alternative (more abstract):**
```
Abstract illustration of a person presenting, smartwatch displaying speaker notes, 
Google Slides icon, clean flat design, teal and white color scheme, 
modern SaaS aesthetic, 16:9 aspect ratio
```

---

## 2. Extension icon/illustration — `extension-illustration.png` (optional)

**Purpose:** Visual for the Extension page.

**Prompt:**
```
Chrome browser extension icon, puzzle piece with presentation slide symbol, 
teal accent color, clean flat design, minimal, 
suitable for documentation website
```

---

## 3. Architecture diagram — `architecture-diagram.png` (optional)

**Purpose:** Visual for How It Works page.

**Prompt:**
```
Simple infographic diagram: three connected nodes labeled Extension, Server, Even Hub, 
arrows between them, clean line art, teal and slate colors, 
minimalist tech illustration, white background
```

---

## Usage

1. Generate images with your preferred tool.
2. Save to `apps/powerslides-docs/public/`:
   - `hero-presentation.jpg` — required for hero
   - Others are optional enhancements
3. Rebuild: `npx nx build powerslides-docs`
