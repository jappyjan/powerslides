/**
 * Convert the raw speaker-note HTML coming from Google Slides into plain text
 * suitable for display on the Even Realities G2 glasses and the browser UI.
 *
 * - `<ul><li>…</li></ul>`  →  `• item`
 * - `<ol><li>…</li></ol>`  →  `1. item`, `2. item` (honours `start=` on `<ol>`)
 * - `<br>`, `</p>`, `</div>` become newlines
 * - Runs of 3+ newlines collapse to 2
 * - Result is trimmed
 *
 * When `DOMParser` is unavailable (SSR / Node without jsdom) this falls back to
 * a regex strip that preserves bullets for `<ul>` but degrades `<ol>` to bullets.
 */
// Minimal DOM types so the helper can be compiled without the browser `lib`
// in tsconfig. At runtime the globals resolve to the real browser APIs.
type DomNode = {
  nodeType: number;
  textContent: string | null;
  childNodes: ArrayLike<DomNode>;
};
type DomElement = DomNode & {
  tagName: string;
  getAttribute(name: string): string | null;
};
type DomDocument = { body: DomNode };
interface DomParserCtor {
  new (): { parseFromString(input: string, mime: string): DomDocument };
}
declare const DOMParser: DomParserCtor | undefined;

type ListFrame = { kind: 'ul' | 'ol'; index: number };

const applyRegexFallback = (value: string): string => {
  const withMarkers = value
    .replace(/<\s*ul\b[^>]*>/gi, '\n')
    .replace(/<\/\s*ul\s*>/gi, '\n')
    .replace(/<\s*ol\b[^>]*>/gi, '\n')
    .replace(/<\/\s*ol\s*>/gi, '\n')
    .replace(/<\s*li\b[^>]*>/gi, '\n• ')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n');
  return withMarkers
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const BLOCK_TAGS = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'BLOCKQUOTE']);
const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

const renderNode = (node: DomNode, listStack: ListFrame[], out: string[]): void => {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    out.push(node.textContent ?? '');
    return;
  }
  if (node.nodeType !== 1 /* ELEMENT_NODE */) {
    return;
  }

  const el = node as DomElement;
  const tag = el.tagName;

  if (tag === 'BR') {
    out.push('\n');
    return;
  }

  if (tag === 'UL' || tag === 'OL') {
    const kind = tag === 'OL' ? 'ol' : 'ul';
    const startAttr = tag === 'OL' ? Number(el.getAttribute('start')) : NaN;
    const startIndex = Number.isFinite(startAttr) && startAttr > 0 ? startAttr - 1 : 0;
    out.push('\n');
    listStack.push({ kind, index: startIndex });
    for (const child of Array.from(el.childNodes)) {
      renderNode(child, listStack, out);
    }
    listStack.pop();
    out.push('\n');
    return;
  }

  if (tag === 'LI') {
    const frame = listStack[listStack.length - 1];
    const marker = frame
      ? frame.kind === 'ol'
        ? `${(frame.index += 1)}. `
        : '• '
      : '• ';
    out.push('\n', marker);
    for (const child of Array.from(el.childNodes)) {
      renderNode(child, listStack, out);
    }
    out.push('\n');
    return;
  }

  if (BLOCK_TAGS.has(tag) || HEADING_TAGS.has(tag)) {
    out.push('\n');
    for (const child of Array.from(el.childNodes)) {
      renderNode(child, listStack, out);
    }
    out.push('\n');
    return;
  }

  for (const child of Array.from(el.childNodes)) {
    renderNode(child, listStack, out);
  }
};

export const normalizeSpeakerNote = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  if (typeof DOMParser === 'undefined') {
    const fallback = applyRegexFallback(value);
    return fallback.length > 0 ? fallback : null;
  }

  const doc = new DOMParser().parseFromString(value, 'text/html');
  const out: string[] = [];
  for (const child of Array.from(doc.body.childNodes)) {
    renderNode(child, [], out);
  }
  const text = out.join('').replace(/\n{3,}/g, '\n\n').trim();
  return text.length > 0 ? text : null;
};
