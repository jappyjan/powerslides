import { Button, Card, CardContent, CardFooter, CardHeader } from "@jappyjan/even-realities-ui";
import { useSlidesContext } from "../slidesContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EvenBetterElementSize, EvenBetterTextElement } from "@jappyjan/even-better-sdk";
import { useLogger } from "../hooks/useLogger";
import { EvenHubEvent } from "@evenrealities/even_hub_sdk";

function formatDuration(durationMs: number) {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatPagination(currentSlide: number, totalSlides: number, presentationDurationMs: number) {
    return `${currentSlide}/${totalSlides} • ${formatDuration(presentationDurationMs)}`;
}

export function SlideControlsV2() {
    const {
        title,
        speakerNote,
        totalSlides,
        currentSlide,
        presentationStartedAt,
        goToNextSlide,
        goToPreviousSlide,
        startPresentation,
        sdk
    } = useSlidesContext();

    const { info: logInfo } = useLogger();

    const { speakerNotesElement, paginationElement, presentationPage, startPresentationPage, startPresentationElement } = useMemo(() => {
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
            .addTextElement(formatPagination(0, 0, 0))
            .setPosition((position) => {
                position.setX(0);
                position.setY(238);
            })
            .setSize((size) => {
                size.setWidth(EvenBetterElementSize.MAX_WIDTH);
                size.setHeight(50);
            }) as EvenBetterTextElement;

        logInfo("slideControlsV2", "Creating start presentation page");
        const startPresentationPage = sdk.createPage("start-presentation");

        logInfo("slideControlsV2", "Creating start presentation element");
        const startPresentationElement = startPresentationPage.addListElement(["Click to start presentation"]);

        return {
            sdk,
            speakerNotesElement,
            paginationElement,
            presentationPage,
            startPresentationPage,
            startPresentationElement
        };
    }, [sdk, logInfo]);


    const handleEvenHubEvent = useCallback((event: EvenHubEvent) => {
        logInfo("slideControlsV2", `Even hub event: ${JSON.stringify(event)}`);
        if (
            event.listEvent?.containerID === startPresentationElement.id &&
            event.listEvent.eventType === OsEventTypeList.CLICK_EVENT
        ) {
            startPresentation();
        }

        if (event.textEvent?.containerID === speakerNotesElement.id) {
            if (event.textEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
                goToNextSlide();
            }

            if (event.textEvent.eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
                goToPreviousSlide();
            }
        }
    }, [startPresentation, goToNextSlide, goToPreviousSlide, speakerNotesElement.id]);

    useEffect(() => {
        logInfo("slideControlsV2", "Adding event listener");
        sdk.addEventListener(handleEvenHubEvent);
        return () => sdk.removeEventListener(handleEvenHubEvent);
    }, [handleEvenHubEvent]);

    useEffect(() => {
        logInfo("slideControlsV2", "Rendering start presentation page");
        startPresentationPage.render();
    }, [startPresentationPage, logInfo]);

    useEffect(() => {
        if (!presentationStartedAt) {
            speakerNotesElement.setContent("Click to start presentation");
        } else {
            speakerNotesElement.setContent(speakerNote ?? "");
        }

        logInfo("slideControlsV2", `Updating speaker notes, startedAt: ${presentationStartedAt}`);
        presentationPage.render();
    }, [speakerNote, presentationStartedAt, speakerNotesElement, presentationPage, logInfo]);

    const [now, setNow] = useState<number>(Date.now());

    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!presentationStartedAt) {
            return;
        }

        const durationMs = now - presentationStartedAt;
        paginationElement.setContent(formatPagination(currentSlide ?? 0, totalSlides ?? 0, durationMs));

        logInfo("slideControlsV2", `Updating pagination, currentSlide: ${currentSlide}, totalSlides: ${totalSlides}, durationMs: ${durationMs}`);

        presentationPage.render();
    }, [currentSlide, totalSlides, presentationStartedAt, paginationElement, presentationPage, now, logInfo]);

    return (
        <div>
            <Card>
                <CardHeader>
                    {title}
                </CardHeader>
                <CardContent className="whitespace-pre-line max-h-[200px] overflow-y-auto">
                    {speakerNote}
                </CardContent>
                <CardFooter className="flex gap-3 flex-row justify-between">
                    {presentationStartedAt ? (<>
                        <Button variant="default" onClick={goToPreviousSlide}>
                            Previous
                        </Button>
                        <Button variant="primary" onClick={goToNextSlide}>
                            Next
                        </Button></>) : (
                        <Button variant="primary" onClick={startPresentation}>
                            Start Presentation
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}