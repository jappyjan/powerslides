import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Text,
} from "@jappyjan/even-realities-ui";
import { useSlidesContext } from "../slidesContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EvenBetterElementSize, EvenBetterTextElement } from "@jappyjan/even-better-sdk";
import { useLogger } from "../hooks/useLogger";
import { EvenHubEvent, OsEventTypeList } from "@evenrealities/even_hub_sdk";

const RING_NAVIGATION_COOLDOWN_MS = 1000;
const DOUBLE_CLICK_WINDOW_MS = 250;
const NOTE_CHUNK_MAX_CHARS = 350;

function formatPagination(currentSlide: number, totalSlides: number) {
  return `${currentSlide}/${totalSlides}`;
}

function formatChunkedPagination(
  currentSlide: number,
  totalSlides: number,
  chunkIndex: number,
  chunkCount: number
) {
  if (chunkCount <= 1) {
    return formatPagination(currentSlide, totalSlides);
  }
  return `${formatPagination(currentSlide, totalSlides)} · ${chunkIndex + 1}/${chunkCount}`;
}

/**
 * Find a natural split point in `text` near (but not above) `max`. Preference:
 * paragraph break > line break > sentence end > space > hard cut. Only falls
 * back to a later preference when the earlier one lands too close to the start
 * (would leave a sliver of a chunk).
 */
function findSplitPoint(text: string, max: number): number {
  if (text.length <= max) return text.length;
  const head = text.slice(0, max);
  const minCut = Math.floor(max * 0.5);

  const paraIdx = head.lastIndexOf("\n\n");
  if (paraIdx >= minCut) return paraIdx + 2;

  const lineIdx = head.lastIndexOf("\n");
  if (lineIdx >= minCut) return lineIdx + 1;

  const sentenceMatches = [...head.matchAll(/[.!?]\s/g)];
  if (sentenceMatches.length > 0) {
    const last = sentenceMatches[sentenceMatches.length - 1];
    const idx = (last.index ?? 0) + last[0].length;
    if (idx >= minCut) return idx;
  }

  const spaceIdx = head.lastIndexOf(" ");
  if (spaceIdx >= minCut) return spaceIdx + 1;

  return max;
}

export function splitNoteIntoChunks(note: string, max = NOTE_CHUNK_MAX_CHARS): string[] {
  if (!note) return [""];
  if (note.length <= max) return [note];
  const chunks: string[] = [];
  let remaining = note;
  while (remaining.length > max) {
    const cut = findSplitPoint(remaining, max);
    const chunk = remaining.slice(0, cut).trimEnd();
    if (chunk.length > 0) chunks.push(chunk);
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks.length > 0 ? chunks : [""];
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
    sdk,
  } = useSlidesContext();

  const { info: logInfo } = useLogger();
  const lastRingNavigationAt = useRef<number>(0);
  const pendingSingleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chunkIndex, setChunkIndex] = useState(0);

  const noteChunks = useMemo(
    () => splitNoteIntoChunks(speakerNote ?? ""),
    [speakerNote]
  );

  // Reset chunk position whenever the active slide or its notes change.
  useEffect(() => {
    setChunkIndex(0);
  }, [speakerNote, currentSlide]);

  // Clamp chunkIndex if the note shrinks.
  const safeChunkIndex = Math.min(chunkIndex, Math.max(noteChunks.length - 1, 0));

  const { speakerNotesElement, paginationElement, presentationPage } = useMemo(() => {
    logInfo("slideControlsV2", "Creating presentation page");
    const presentationPage = sdk.createPage("presentation");

    logInfo("slideControlsV2", "Creating speaker notes element");
    const speakerNotesElement = presentationPage
      .addTextElement("Syncing…")
      .setPosition((position) => {
        position.setX(0);
        position.setY(0);
      })
      .setSize((size) => {
        size.setWidth(EvenBetterElementSize.MAX_WIDTH);
        size.setHeight(EvenBetterElementSize.MAX_HEIGHT);
      })
      .markAsEventCaptureElement() as EvenBetterTextElement;

    logInfo("slideControlsV2", "Creating pagination element");
    const paginationElement = presentationPage
      .addTextElement(formatPagination(0, 0))
      .setPosition((position) => {
        position.setX(0);
        position.setY(238);
      })
      .setSize((size) => {
        size.setWidth(EvenBetterElementSize.MAX_WIDTH);
        size.setHeight(50);
      }) as EvenBetterTextElement;

    return {
      speakerNotesElement,
      paginationElement,
      presentationPage,
    };
  }, [sdk]);

  const cancelPendingSingleClick = useCallback(() => {
    if (pendingSingleClickTimerRef.current) {
      clearTimeout(pendingSingleClickTimerRef.current);
      pendingSingleClickTimerRef.current = null;
    }
  }, []);

  const handleEvenHubEvent = useCallback(
    (event: EvenHubEvent) => {
      logInfo("slideControlsV2", `Even hub event: ${JSON.stringify(event)}`);

      const textEvent = event.textEvent;
      const isTargetElement =
        textEvent &&
        (textEvent.containerID === speakerNotesElement.id ||
          textEvent.containerName === String(speakerNotesElement.id));
      if (!isTargetElement || !textEvent) {
        return;
      }

      // Scroll events navigate between chunks within the current note. They
      // never advance/rewind the slide — that's reserved for taps.
      if (textEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
        setChunkIndex((current) => {
          const maxIndex = Math.max(noteChunks.length - 1, 0);
          return current < maxIndex ? current + 1 : current;
        });
        return;
      }
      if (textEvent.eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
        setChunkIndex((current) => (current > 0 ? current - 1 : 0));
        return;
      }

      // Slide navigation — respect the cooldown and the transition state.
      if (isTransitioning) {
        return;
      }
      const now = Date.now();
      if (now - lastRingNavigationAt.current < RING_NAVIGATION_COOLDOWN_MS) {
        logInfo("slideControlsV2", "Ignoring ring nav (cooldown)");
        return;
      }

      if (textEvent.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
        // Double-tap wins over a pending single-tap.
        cancelPendingSingleClick();
        lastRingNavigationAt.current = now;
        logInfo("slideControlsV2", "Double-click event, going to previous slide");
        goToPreviousSlide();
        return;
      }

      if (textEvent.eventType === OsEventTypeList.CLICK_EVENT) {
        // Defer single-tap briefly so a following double-tap can cancel it.
        cancelPendingSingleClick();
        pendingSingleClickTimerRef.current = setTimeout(() => {
          pendingSingleClickTimerRef.current = null;
          lastRingNavigationAt.current = Date.now();
          logInfo("slideControlsV2", "Click event, going to next slide");
          goToNextSlide();
        }, DOUBLE_CLICK_WINDOW_MS);
      }
    },
    [
      cancelPendingSingleClick,
      goToNextSlide,
      goToPreviousSlide,
      isTransitioning,
      logInfo,
      noteChunks.length,
      speakerNotesElement.id,
    ]
  );

  useEffect(() => {
    logInfo("slideControlsV2", "Adding event listener");
    sdk.addEventListener(handleEvenHubEvent);
    return () => sdk.removeEventListener(handleEvenHubEvent);
  }, [handleEvenHubEvent, sdk, logInfo]);

  useEffect(() => {
    return () => cancelPendingSingleClick();
  }, [cancelPendingSingleClick]);

  useEffect(() => {
    const chunkCount = noteChunks.length;
    const activeChunk = noteChunks[safeChunkIndex] ?? "";
    const hasMoreBelow = chunkCount > 1 && safeChunkIndex < chunkCount - 1;
    const newSpeakerNote = isTransitioning
      ? "Syncing…"
      : activeChunk.length > 0
        ? hasMoreBelow
          ? `${activeChunk}\n▾`
          : activeChunk
        : "";
    speakerNotesElement.setContent(newSpeakerNote);
    const paginationText = formatChunkedPagination(
      currentSlide ?? 0,
      totalSlides ?? 0,
      safeChunkIndex,
      chunkCount
    );
    paginationElement.setContent(paginationText);
    logInfo(
      "slideControlsV2",
      `Updating content, calling render (slide ${currentSlide}/${totalSlides}, chunk ${safeChunkIndex + 1}/${chunkCount}, transitioning: ${isTransitioning})`
    );
    presentationPage.render();
  }, [
    noteChunks,
    safeChunkIndex,
    currentSlide,
    totalSlides,
    isTransitioning,
    speakerNotesElement,
    paginationElement,
    presentationPage,
    logInfo,
  ]);

  const notesContent = isTransitioning ? (
    <span className="flex items-center gap-2 text-gray-500">
      <span
        className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden
      />
      Syncing…
    </span>
  ) : speakerNote ? (
    speakerNote
  ) : (
    <span className="text-gray-500">No notes</span>
  );

  const chunkIndicator =
    !isTransitioning && noteChunks.length > 1 ? (
      <Text variant="detail" className="text-gray-500">
        Glasses showing {safeChunkIndex + 1}/{noteChunks.length} · scroll ring to page
      </Text>
    ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-row justify-end px-1 py-2">
        <button
          type="button"
          onClick={disconnect}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Disconnect
        </button>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Card className="flex flex-1 flex-col overflow-hidden">
          {title && (
            <CardHeader className="shrink-0">
              <Text variant="body-2" className="text-gray-600">
                {title}
              </Text>
            </CardHeader>
          )}

          <CardContent className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line">
            {notesContent}
          </CardContent>

          <div className="shrink-0 border-t border-gray-200 px-4 py-3">
            <div className="mb-3 flex flex-col gap-1">
              <Text variant="detail" className="block text-gray-600">
                {formatPagination(currentSlide ?? 0, totalSlides ?? 0)}
              </Text>
              {chunkIndicator}
            </div>
            <div className="flex flex-row justify-between gap-3">
              <Button
                variant="default"
                onClick={goToPreviousSlide}
                disabled={
                  isTransitioning ||
                  (currentSlide !== null && currentSlide <= 1)
                }
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={goToNextSlide}
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
