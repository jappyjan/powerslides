# Browser Extension Layout Design

> Design draft for the PowerSlides browser extension popup. Uses `@jappyjan/even-realities-ui` to align with the main app. Minimalistic, production-ready.

---

## 1. Current State (Reference)

**Structure:**
- Header: "Slide Control" + "Google Slides tools"
- Section: Presenter actions (Open present mode, Prev/Next)
- Section: Remote pairing (Start/Stop session, pairing code)
- Section: Slide info (current/total, speaker notes)
- Footer: Status + errors

**Issues:**
- Generic labels ("Presenter actions", "Remote pairing")
- Dense, section-heavy layout
- Custom CSS instead of shared component library
- Status/error placement feels tacked on

---

## 2. Design Principles

- **Minimal** — Only essential controls; no decorative text
- **Hierarchical** — Primary actions prominent; secondary grouped
- **Consistent** — Same Card/Button/Text patterns as main app
- **Scannable** — Clear visual grouping; quick to parse
- **Responsive to state** — Loading, error, and empty states handled clearly

---

## 3. Proposed Layout

### 3.1 Overall Structure

```
┌─────────────────────────────────────┐
│  [Brand / Title]                     │
├─────────────────────────────────────┤
│  ┌─ Slide ────────────────────────┐ │
│  │ 3 / 12          [⟲ loading]     │ │
│  │ Speaker notes preview...        │ │
│  │ [← Prev]        [Next →]        │ │
│  └────────────────────────────────┘ │
│  ┌─ Remote Control ────────────────┐ │
│  │ Pair with Even Hub              │ │
│  │ [Start] [Stop]                  │ │
│  │ Code: ABCD-EFGH-IJKL            │ │
│  └────────────────────────────────┘ │
│  [Present]  ← only when not in present mode
├─────────────────────────────────────┤
│  Status / Error (subtle)             │
└─────────────────────────────────────┘
```

### 3.2 Section Details

#### A. Header
- **Title:** "PowerSlides" (or "Slide Control" if brand differs)
- **Subtitle:** None — keep it clean. Or single line: "Google Slides → Even Hub"
- **Style:** `Text variant="title-1"` or `title-2`; no extra section box

#### B. Slide Card (Primary)
- **CardHeader:** Slide position — e.g. `3 / 12` with optional loading spinner
- **CardContent:** Speaker notes (truncated, scrollable if long)
- **CardFooter:** Two buttons: `Previous` (default) | `Next` (primary)
- **Labels:** "Previous" / "Next" — short, clear
- **Empty state:** "—" or "No notes" when no speaker notes

#### C. Remote Control Card (Secondary)
- **CardHeader:** "Remote Control" or "Pair with Even Hub"
- **CardContent:**
  - When inactive: "Start a session to get a pairing code."
  - When active: Large, monospace pairing code (e.g. `ABCD-EFGH-IJKL`)
- **CardFooter:** `Start session` | `Stop session` (or `End session`)
- **Labels:** "Start session" / "Stop session" — action-oriented
- **Error:** Inline `Text variant="detail"` in red below content

#### D. Present Mode (Standalone)
- Single full-width button: **"Present"**
- **Visibility:** Only shown when the user is *not* already in present mode (i.e. when the active tab URL does not contain `/present`)
- Placed below Remote card; primary variant for emphasis
- Rationale: One-click entry to presentation; hide when already presenting

#### E. Status / Error Footer
- Single line: connection status or error
- `Text variant="detail"`; muted color
- Only show when relevant (e.g. "Ready", "Error: …", "No Slides tab")
- No box; just text at bottom

---

## 4. Label Refinements

| Current | Proposed | Rationale |
|---------|-----------|-----------|
| Slide Control | PowerSlides | Brand consistency |
| Google Slides tools | (remove or "Google Slides") | Redundant |
| Presenter actions | (remove section label) | Actions speak for themselves |
| Open present mode | Present | Shorter |
| Previous slide | Previous | Shorter |
| Next slide | Next | Shorter |
| Remote pairing | Remote Control | Clearer |
| Start remote session | Start session | Shorter |
| Stop remote session | Stop session | Shorter |
| Enter this code in the Even Hub app | Pair with Even Hub | Clearer CTA |
| Slide info | (use CardHeader "Slide") | Section = card |
| Current slide: X / Y | Just "X / Y" in header | Cleaner |
| Status: … | (inline, subtle) | Less prominent |

---

## 5. Component Mapping

| Element | Component |
|---------|-----------|
| Title | `Text variant="title-1"` or `title-2` |
| Section headers | `CardHeader` with `Text` |
| Cards | `Card`, `CardContent`, `CardFooter` |
| Primary actions | `Button variant="primary"` |
| Secondary actions | `Button variant="default"` |
| Destructive (Stop) | `Button variant="negative"` (optional) |
| Pairing code | `Text variant="body-1"` or custom monospace |
| Notes / hints | `Text variant="body-2"` or `detail` |
| Errors | `Text variant="detail"` + error styling |
| Icons | `ChevronBackIcon`, `ChevronSmallDrillDown` (or similar) for prev/next if desired |

---

## 6. States to Handle

| State | Behavior |
|-------|----------|
| No Slides tab | Show error; disable slide actions |
| Loading slide data | Spinner in Slide card header |
| Transitioning (prev/next) | Disable buttons; show loading in content |
| Pairing inactive | Show "Start session" CTA |
| Pairing active | Show code; "Stop session" |
| Pairing error | Inline error in Remote card |
| Already in present mode | Hide Present button |
| No speaker notes | Show "—" or "No notes" |

---

## 7. Visual Hierarchy

1. **Slide card** — Largest; first thing user sees
2. **Remote card** — Secondary; smaller or same size
3. **Present button** — Full width; high contrast; *hidden when already in present mode*
4. **Status** — Minimal; bottom of popup

---

## 8. Popup Constraints

- Min size: ~320×320px (from current CSS)
- Extension popups are small; avoid long text
- Prefer vertical scroll over horizontal
- Buttons: comfortable tap targets (min 36px height)

---

## 9. Open Questions

1. **Brand:** "PowerSlides" vs "Slide Control" for header?
2. **Present button:** Inside a card or standalone? (Proposal: standalone below Remote) — **Visibility:** only when not in present mode (detect via tab URL `includes('/present')`)
3. **Icons:** Use ChevronBack/Forward for Prev/Next, or text-only?
4. **Stop session:** `variant="negative"` for emphasis, or `default` to avoid alarm?

---

## 10. Summary

- **3 main blocks:** Slide card → Remote card → Present button
- **Footer:** Status/error only when needed
- **Labels:** Short, action-oriented
- **Components:** Card, Button, Text from `@jappyjan/even-realities-ui`
- **Styles:** Import `@jappyjan/even-realities-ui/styles`; use Tailwind for layout (gap, flex)
- **No custom popup CSS** — rely on library + minimal overrides

---

*Ready for review. Adjust labels, order, or hierarchy as needed before implementation.*
