# PowerSlides App — Layout & Design Draft

> **Scope**: `apps/powerslides` — the Even Better wearable app for remote slide control.  
> **Purpose**: Minimalistic, production-ready UI. Draft for approval before implementation.

---

## 1. Current State (Reference Only)

### Pairing Screen (`SlideCodeInput`)
- Card: "Manual pairing code" header
- Input placeholder: `ABCD-EFGH-IJKL`
- Helper: "Enter the code shown in the slide control extension."
- Button: "Connect" / "Connecting..." — **bug**: duplicate "Connect" in JSX
- **Gap**: Errors thrown but never shown in UI

### Controls Screen (`SlideControlsV2`)
- Card header: slide title + spinner when transitioning
- Content: speaker notes (scrollable, max 200px) or "Updating..." with spinner
- Footer: Previous | Next buttons

### Log Panel (`Log`)
- Always visible below main content
- "Logs" label + copy button (generic `aria-label`)
- Uses `alert()` for copy feedback

### App Shell (`app.tsx`)
- No header, no branding
- AppContent + Log stacked with minimal spacing
- No disconnect option when connected

---

## 2. Design Principles

| Principle | Application |
|-----------|--------------|
| **Minimal** | Fewer elements, no decorative clutter. Every element earns its place. |
| **Functional** | Labels and actions are clear. No jargon. |
| **Hierarchy** | Primary actions stand out. Secondary info recedes. |
| **Calm** | Generous spacing, soft contrast, no visual noise. |
| **Accessible** | Sufficient contrast, readable text, clear focus states, proper ARIA. |

---

## 3. Proposed Layouts

### 3.1 Pairing Screen (Disconnected)

**Goal**: One clear task — enter code, connect. No friction.

```
┌─────────────────────────────────────────┐
│                                         │
│  PowerSlides                            │  ← App title, subtle
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Pairing code                    │   │  ← Section label
│  │                                 │   │
│  │  ┌───────────────────────────┐  │   │
│  │  │ ABCD-EFGH-IJKL            │  │   │  ← Input, monospace font
│  │  └───────────────────────────┘  │   │
│  │                                 │   │
│  │  Get the code from the          │   │  ← One-line hint
│  │  extension popup.               │   │
│  │                                 │   │
│  │  [ Connect ]                    │   │  ← Primary CTA, full-width
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─ Error (when present) ───────────┐   │
│  │  Code expired. Get a new one    │   │  ← Inline, red-tinted
│  │  from the extension.             │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Label changes**:

| Current | Proposed | Rationale |
|---------|----------|-----------|
| Manual pairing code | Pairing code | Shorter, still clear. |
| Enter the code shown in the slide control extension | Get the code from the extension popup. | Shorter, actionable. |
| Connect / Connecting... | Connect / Connecting… | Keep. Fix duplicate "Connect" bug. |

**New**:
- **Error display**: Inline error message when `connect()` throws (expired, invalid, join failed).
- **App title**: "PowerSlides" at top for branding and orientation.

---

### 3.2 Controls Screen (Connected)

**Goal**: Focus on speaker notes and navigation. Minimal chrome.

```
┌─────────────────────────────────────────┐
│                                         │
│  PowerSlides              Disconnect    │  ← Title + subtle link
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Slide title (optional)         │   │  ← Deck/slide name, subtle
│  │                                 │   │
│  │  Speaker notes text here…       │   │  ← Scrollable, can be long
│  │  (scrollable area)              │   │
│  │  …                              │   │
│  │  …                              │   │
│  │                                 │   │
│  ├─────────────────────────────────┤   │
│  │  3 / 12                         │   │  ← Pagination
│  │  [ Back ]           [ Next ]     │   │  ← Floating at bottom, always visible
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Label changes**:

| Current | Proposed | Rationale |
|---------|----------|-----------|
| Previous | Back | Shorter, natural on wearables. |
| Next | Next | Keep. |
| Updating... | Syncing… | Lighter, consistent with extension. |
| Loading... (SDK element) | Syncing… | Consistent. |

**New**:
- **Speaker notes**: Scrollable area, can be long. "No notes" when empty, "Syncing…" when loading.
- **Pagination**: Below notes, above buttons.
- **Buttons**: Back/Next float at bottom of screen — always visible, above the scrollable notes.
- **Empty state**: "No notes" when `speakerNote` is empty.
- **Disconnect**: Simple text link "Disconnect" in header (subtle, tappable).

---

### 3.3 Log Panel

**Decision**: Collapsible, default closed.
- Header: "Logs" with chevron. Click to expand/collapse.
- Copy button: `aria-label="Copy logs"`.
- Replace `alert()` with inline "Copied" feedback (2s, then fade).

---

## 4. App Shell & Structure

### Layout hierarchy

```
App
├── [Optional] App header
│   └── PowerSlides [+ disconnect when connected]
├── Main content (full width)
│   ├── SlideCodeInput (pairing)
│   └── SlideControlsV2 (controls)
└── Log (collapsible)
```

### Spacing
- Section gap: `gap-6` (24px) between main content and log.
- Card internal: `gap-4` (16px) between header, content, footer.
- Consistent padding: `p-4` or `p-5` for cards.

### Header
- **Pairing**: "PowerSlides" only.
- **Controls**: "PowerSlides" + "Disconnect" text link.

---

## 5. Error Messages (Copy)

| Scenario | Message |
|----------|---------|
| Code expired | Code expired. Get a new one from the extension. |
| Invalid code | Invalid code. Use the 12-character format. |
| Join failed (WebSocket close) | Connection failed. Check the code and try again. |

---

## 6. Visual Style

- **Typography**: Use `@jappyjan/even-realities-ui` variants. `title-2` for section headers, `body-2` for content, `detail` for hints/status.
- **Theme**: Use default from even-realities-ui (light).
- **Input**: Monospace for pairing code (e.g. `font-mono`).
- **Buttons**: Primary for Connect, Next. Default for Back, Disconnect.
- **Errors**: Red-tinted text, `variant="detail"` or similar. No heavy borders.
- **Loading**: Single spinner, "Syncing…" label. No duplicate spinners.
- **Controls layout**: Flex column — scrollable notes (flex-1, overflow-y-auto) + fixed bottom bar (pagination + Back/Next). Buttons always visible regardless of notes length.

---

## 7. Implementation Checklist

### Pairing screen
- [x] Add "PowerSlides" app title
- [x] Change "Manual pairing code" → "Pairing code"
- [x] Shorten helper text
- [x] Fix duplicate "Connect" bug in `SlideCodeInput`
- [x] Surface errors from `connect()` in UI (state + inline message)

### Controls screen
- [x] Add "PowerSlides" header + Disconnect link
- [x] Float Back/Next buttons at bottom (always visible above scrollable notes)
- [x] Show pagination below notes, above buttons
- [x] "Back" / "Next" for buttons
- [x] "Syncing…" instead of "Updating…" / "Loading..."
- [x] "No notes" empty state
- [x] Expose `disconnect` in UI

### Log
- [x] Collapsible (default closed)
- [x] `aria-label="Copy logs"` for copy button
- [x] Replace `alert()` with inline "Copied" feedback

### App shell
- [x] Add app header with branding
- [x] Consistent spacing between sections

---

## 8. Decisions Summary

| Item | Decision |
|------|----------|
| Log | Collapsible, default closed |
| Disconnect | Simple text link "Disconnect" in header |
| Pagination | Below notes (easier to reach) |
| Theme | Default from even-realities-ui (light) |

---

**Ready for implementation** once approved.
