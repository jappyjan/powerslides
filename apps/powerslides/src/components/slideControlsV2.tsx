import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Text,
} from "@jappyjan/even-realities-ui";
import { useSlidesContext } from "../slidesContext";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { EvenBetterElementSize, EvenBetterTextElement } from "@jappyjan/even-better-sdk";
import { useLogger } from "../hooks/useLogger";
import { EvenHubEvent, OsEventTypeList } from "@evenrealities/even_hub_sdk";

const RING_NAVIGATION_COOLDOWN_MS = 1000;

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
    sdk,
  } = useSlidesContext();

  const { info: logInfo } = useLogger();
  const lastRingNavigationAt = useRef<number>(0);

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

  const handleEvenHubEvent = useCallback(
    (event: EvenHubEvent) => {
      logInfo("slideControlsV2", `Even hub event: ${JSON.stringify(event)}`);

      const textEvent = event.textEvent;
      const isTargetElement =
        textEvent &&
        (textEvent.containerID === speakerNotesElement.id ||
          textEvent.containerName === String(speakerNotesElement.id));
      if (isTargetElement && textEvent && !isTransitioning) {
        const now = Date.now();
        if (now - lastRingNavigationAt.current < RING_NAVIGATION_COOLDOWN_MS) {
          logInfo("slideControlsV2", "Ignoring ring scroll (cooldown)");
          return;
        }
        lastRingNavigationAt.current = now;

        if (textEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
          logInfo("slideControlsV2", "Scrolling bottom event, going to next slide");
          goToNextSlide();
        }

        if (textEvent.eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
          logInfo("slideControlsV2", "Scrolling top event, going to previous slide");
          goToPreviousSlide();
        }
      }
    },
    [goToNextSlide, goToPreviousSlide, speakerNotesElement.id, isTransitioning]
  );

  useEffect(() => {
    logInfo("slideControlsV2", "Adding event listener");
    sdk.addEventListener(handleEvenHubEvent);
    return () => sdk.removeEventListener(handleEvenHubEvent);
  }, [handleEvenHubEvent, sdk]);

  useEffect(() => {
    const newSpeakerNote = isTransitioning ? "Syncing…" : (speakerNote ?? "");
    speakerNotesElement.setContent(newSpeakerNote);
    const paginationText = formatPagination(
      currentSlide ?? 0,
      totalSlides ?? 0
    );
    paginationElement.setContent(paginationText);
    logInfo(
      "slideControlsV2",
      `Updating content, calling render (slide ${currentSlide}/${totalSlides}, transitioning: ${isTransitioning})`
    );
    presentationPage.render();
  }, [
    speakerNote,
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
            <Text variant="detail" className="mb-3 block text-gray-600">
              {formatPagination(currentSlide ?? 0, totalSlides ?? 0)}
            </Text>
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
