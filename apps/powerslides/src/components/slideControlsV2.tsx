import { Button, Card, CardContent, CardFooter, CardHeader } from "@jappyjan/even-realities-ui";
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
        sdk
    } = useSlidesContext();

    const { info: logInfo } = useLogger();
    const lastRingNavigationAt = useRef<number>(0);

    const { speakerNotesElement, paginationElement, presentationPage } = useMemo(() => {
        logInfo("slideControlsV2", "Creating presentation page");
        const presentationPage = sdk.createPage("presentation");

        logInfo("slideControlsV2", "Creating speaker notes element");
        const speakerNotesElement = presentationPage
            .addTextElement(
                "Loading..."
            )
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


    const handleEvenHubEvent = useCallback((event: EvenHubEvent) => {
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
    }, [goToNextSlide, goToPreviousSlide, speakerNotesElement.id, isTransitioning]);

    useEffect(() => {
        logInfo("slideControlsV2", "Adding event listener");
        sdk.addEventListener(handleEvenHubEvent);
        return () => sdk.removeEventListener(handleEvenHubEvent);
    }, [handleEvenHubEvent]);

    useEffect(() => {
        const newSpeakerNote = isTransitioning ? "Loading..." : (speakerNote ?? "");
        speakerNotesElement.setContent(newSpeakerNote);
        const paginationText = formatPagination(currentSlide ?? 0, totalSlides ?? 0);
        paginationElement.setContent(paginationText);
        logInfo("slideControlsV2", `Updating content, calling render (slide ${currentSlide}/${totalSlides}, transitioning: ${isTransitioning})`);
        presentationPage.render();
    }, [speakerNote, currentSlide, totalSlides, isTransitioning, speakerNotesElement, paginationElement, presentationPage, logInfo]);

    return (
        <div>
            <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                    {title}
                    {isTransitioning && (
                        <span
                            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70"
                            aria-hidden
                        />
                    )}
                </CardHeader>
                <CardContent className="whitespace-pre-line max-h-[200px] overflow-y-auto relative">
                    {isTransitioning ? (
                        <span className="flex items-center gap-2 text-gray-500">
                            <span
                                className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
                                aria-hidden
                            />
                            Updating...
                        </span>
                    ) : (
                        speakerNote
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <div className="flex gap-3 flex-row justify-between">
                        <Button
                            variant="default"
                            onClick={goToPreviousSlide}
                            disabled={isTransitioning || (currentSlide !== null && currentSlide <= 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="primary"
                            onClick={goToNextSlide}
                            disabled={isTransitioning || (currentSlide !== null && totalSlides !== null && currentSlide >= totalSlides)}
                        >
                            Next
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}