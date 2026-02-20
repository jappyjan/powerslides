import { Button, Card, CardContent, CardFooter, CardHeader } from "@jappyjan/even-realities-ui";
import { useSlidesContext } from "../slidesContext";
import { useCallback, useEffect, useMemo } from "react";
import { EvenBetterElementSize, EvenBetterTextElement } from "@jappyjan/even-better-sdk";
import { useLogger } from "../hooks/useLogger";
import { EvenHubEvent, OsEventTypeList } from "@evenrealities/even_hub_sdk";

function formatPagination(currentSlide: number, totalSlides: number) {
    return `${currentSlide}/${totalSlides}`;
}

export function SlideControlsV2() {
    const {
        title,
        speakerNote,
        totalSlides,
        currentSlide,
        goToNextSlide,
        goToPreviousSlide,
        sdk
    } = useSlidesContext();

    const { info: logInfo } = useLogger();

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
            sdk,
            speakerNotesElement,
            paginationElement,
            presentationPage,
        };
    }, [sdk]);


    const handleEvenHubEvent = useCallback((event: EvenHubEvent) => {
        logInfo("slideControlsV2", `Even hub event: ${JSON.stringify(event)}`);


        if (event.textEvent?.containerID === speakerNotesElement.id) {
            if (event.textEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
                logInfo("slideControlsV2", "Scrolling bottom event, going to next slide");
                goToNextSlide();
            }

            if (event.textEvent.eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
                logInfo("slideControlsV2", "Scrolling top event, going to previous slide");
                goToPreviousSlide();
            }
        }
    }, [goToNextSlide, goToPreviousSlide, speakerNotesElement.id]);

    useEffect(() => {
        logInfo("slideControlsV2", "Adding event listener");
        sdk.addEventListener(handleEvenHubEvent);
        return () => sdk.removeEventListener(handleEvenHubEvent);
    }, [handleEvenHubEvent]);


    useEffect(() => {
        speakerNotesElement.setContent(speakerNote ?? "");
        paginationElement.setContent(formatPagination(currentSlide ?? 0, totalSlides ?? 0));
        logInfo("slideControlsV2", `Updating content, calling render (slide ${currentSlide}/${totalSlides})`);
        presentationPage.render();
    }, [speakerNote, currentSlide, totalSlides, speakerNotesElement, paginationElement, presentationPage, logInfo]);

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
                    <Button variant="default" onClick={goToPreviousSlide}>
                        Previous
                    </Button>
                    <Button variant="primary" onClick={goToNextSlide}>
                        Next
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}