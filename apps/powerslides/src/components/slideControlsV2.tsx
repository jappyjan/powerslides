import { useCallback, useMemo } from "react";
import { Button, Card } from "even-toolkit/web";
import { useGlasses } from "even-toolkit/useGlasses";
import type { GlassAction, GlassNavState, DisplayData } from "even-toolkit/types";
import { line } from "even-toolkit/types";
import {
  buildScrollableContent,
  DEFAULT_CONTENT_SLOTS,
} from "even-toolkit/glass-display-builders";
import { wordWrap } from "even-toolkit/paginate-text";
import { moveHighlight, calcMaxScroll } from "even-toolkit/glass-nav";
import { useSlidesContext } from "../slidesContext";

const GLASS_LINE_CHARS = 46;
const APP_NAME = "powerslides";

type Snapshot = {
  title: string | null;
  speakerNote: string | null;
  currentSlide: number | null;
  totalSlides: number | null;
  isTransitioning: boolean;
};

function formatPagination(currentSlide: number, totalSlides: number) {
  return `${currentSlide}/${totalSlides}`;
}

export function SlideControlsV2() {
  const {
    title,
    speakerNote,
    totalSlides,
    currentSlide,
    isTransitioning,
    goToNextSlide,
    goToPreviousSlide,
    disconnect,
  } = useSlidesContext();

  const snapshot = useMemo<Snapshot>(
    () => ({ title, speakerNote, currentSlide, totalSlides, isTransitioning }),
    [title, speakerNote, currentSlide, totalSlides, isTransitioning]
  );

  const getSnapshot = useCallback(() => snapshot, [snapshot]);

  const toDisplayData = useCallback(
    (snap: Snapshot, nav: GlassNavState): DisplayData => {
      if (snap.isTransitioning) {
        return { lines: [line("Syncing…", "meta")] };
      }

      const header = formatPagination(
        snap.currentSlide ?? 0,
        snap.totalSlides ?? 0
      );
      const wrapped = snap.speakerNote
        ? wordWrap(snap.speakerNote, GLASS_LINE_CHARS)
        : [];
      const contentLines = wrapped.length > 0 ? wrapped : ["No notes"];

      return buildScrollableContent({
        title: header,
        actionBar: "",
        contentLines,
        scrollPos: nav.highlightedIndex,
        contentSlots: DEFAULT_CONTENT_SLOTS,
        contentStyle: "normal",
      });
    },
    []
  );

  const onGlassAction = useCallback(
    (action: GlassAction, nav: GlassNavState, snap: Snapshot): GlassNavState => {
      if (snap.isTransitioning) {
        return nav;
      }

      if (action.type === "SELECT_HIGHLIGHTED") {
        // Single tap → next slide; reset scroll for the new note.
        void goToNextSlide();
        return { ...nav, highlightedIndex: 0 };
      }

      if (action.type === "GO_BACK") {
        // Double tap → previous slide; reset scroll.
        void goToPreviousSlide();
        return { ...nav, highlightedIndex: 0 };
      }

      if (action.type === "HIGHLIGHT_MOVE") {
        const wrapped = snap.speakerNote
          ? wordWrap(snap.speakerNote, GLASS_LINE_CHARS)
          : [];
        const maxScroll = calcMaxScroll(
          Math.max(wrapped.length, 1),
          DEFAULT_CONTENT_SLOTS
        );
        return {
          ...nav,
          highlightedIndex: moveHighlight(
            nav.highlightedIndex,
            action.direction,
            maxScroll
          ),
        };
      }

      return nav;
    },
    [goToNextSlide, goToPreviousSlide]
  );

  const deriveScreen = useCallback(() => "presentation", []);

  useGlasses<Snapshot>({
    appName: APP_NAME,
    getSnapshot,
    toDisplayData,
    onGlassAction,
    deriveScreen,
    // Keep double-tap wired to our own "previous slide" handler instead of
    // the native shutdown dialog.
    shutdownOnHomeBack: false,
  });

  const notesContent = isTransitioning ? (
    <span
      className="flex items-center gap-2"
      style={{ color: "var(--color-text-dim)" }}
    >
      <span
        className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden
      />
      Syncing…
    </span>
  ) : speakerNote ? (
    speakerNote
  ) : (
    <span style={{ color: "var(--color-text-dim)" }}>No notes</span>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-row justify-end px-1 py-2">
        <button
          type="button"
          onClick={disconnect}
          className="text-subtitle underline hover:opacity-80"
          style={{ color: "var(--color-text-dim)" }}
        >
          Disconnect
        </button>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Card padding="none" className="flex flex-1 flex-col overflow-hidden">
          {title && (
            <div
              className="shrink-0 px-4 py-3"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <p
                className="text-normal-body"
                style={{ color: "var(--color-text-dim)" }}
              >
                {title}
              </p>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line px-4 py-3 text-medium-body">
            {notesContent}
          </div>

          <div
            className="shrink-0 px-4 py-3"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <p
              className="mb-3 block text-detail"
              style={{ color: "var(--color-text-dim)" }}
            >
              {formatPagination(currentSlide ?? 0, totalSlides ?? 0)}
            </p>
            <div className="flex flex-row justify-between gap-3">
              <Button
                variant="default"
                onClick={() => {
                  void goToPreviousSlide();
                }}
                disabled={
                  isTransitioning ||
                  (currentSlide !== null && currentSlide <= 1)
                }
              >
                Back
              </Button>
              <Button
                variant="highlight"
                onClick={() => {
                  void goToNextSlide();
                }}
                disabled={
                  isTransitioning ||
                  (currentSlide !== null &&
                    totalSlides !== null &&
                    currentSlide >= totalSlides)
                }
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
