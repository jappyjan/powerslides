import { Badge, Button, Card, CardContent, CardFooter, CardHeader } from "@jappyjan/even-realities-ui";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { EvenHubEvent, OsEventTypeList } from "@evenrealities/even_hub_sdk";
import { EvenBetterElementSize } from "@jappyjan/even-better-sdk";
import { useLogger } from "../hooks/useLogger";
import { useSlidesContext } from "../slidesContext";

interface Props {
    title: string | null;
    presentationDurationMs: number | null;
    speakerNote: string | null;
    goToNextSlide: () => void;
    goToPreviousSlide: () => void;
    startPresentation: () => void;
    totalSlides: number | null;
    currentSlide: number | null;
    loading: boolean;
}

// Helper to format duration as mm:ss
const formatDuration = (ms: number | null) => {
    if (ms == null) return "--:--";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatPagination = (currentSlide: number, totalSlides: number, presentationDurationMs: number) => {
    return `${currentSlide}/${totalSlides} • ${formatDuration(presentationDurationMs)}`;
};

export function SlideControls(props: Props) {
    const { loading, title, presentationDurationMs, speakerNote: speakerNoteHtml, goToNextSlide, goToPreviousSlide, startPresentation, totalSlides, currentSlide } = props;

    const { info: logInfo } = useLogger();
    const { sdk } = useSlidesContext();

    const waitForStartPresentationPage = useRef(sdk.createPage("wait-for-start-presentation"));
    const presentationPage = useRef(sdk.createPage("presentation"));
    const speakerNotesElement = useRef(presentationPage.current.addTextElement("loading..."));

    // render initial page with waiting for start presentation list
    useEffect(() => {
        waitForStartPresentationPage.current.addListElement(["Click to start presentation"]);
        waitForStartPresentationPage.current.render();
    }, []);

    const paginationElement = useRef(presentationPage.current.addTextElement(formatPagination(0, 0, 0)));

    const speakerNote = useMemo(() => {
        if (!speakerNoteHtml) return undefined;

        // Preserve common block/line break tags before stripping HTML.
        const htmlWithBreaks = speakerNoteHtml
            .replace(/<\s*br\s*\/?>/gi, "\n")
            .replace(/<\/\s*p\s*>/gi, "\n")
            .replace(/<\/\s*div\s*>/gi, "\n")
            .replace(/<\/\s*li\s*>/gi, "\n");

        if (typeof DOMParser === "undefined") {
            return htmlWithBreaks.replace(/<[^>]+>/g, "");
        }

        const doc = new DOMParser().parseFromString(htmlWithBreaks, "text/html");
        const text = doc.body.textContent ?? "";
        const cleanText = text.replace(/\n{3,}/g, "\n\n").trim();
        return '\n\n' + cleanText;
    }, [speakerNoteHtml]);

    const hasPresentationStarted = useMemo(() => presentationDurationMs !== null, [presentationDurationMs]);

    const handleEvenHubEvent = useCallback((event: EvenHubEvent) => {
        if (event.textEvent?.containerID === speakerNotesElement.current.id) {
            if (event.textEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
                goToNextSlide();
            }

            if (event.textEvent.eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
                goToPreviousSlide();
            }
        }

        logInfo('slide-controls', `even hub event: ${event.listEvent?.containerID}`);
        if (event.listEvent?.containerID === speakerNotesElement.current.id) {
            startPresentation();
        }
    }, [goToNextSlide, goToPreviousSlide, startPresentation, logInfo, speakerNotesElement.current.id]);

    useEffect(() => {
        sdk.addEventListener(handleEvenHubEvent);
        return () => sdk.removeEventListener(handleEvenHubEvent);
    }, [handleEvenHubEvent]);

    const getSpeakerNotesContent = useCallback(() => {
        if (loading) return "Loading...";

        return speakerNote?.substring(0, 1500) ?? "No speaker note";
    }, [loading, speakerNote]);

    useEffect(() => {
        speakerNotesElement.current
            .setPosition((position) => {
                position.setX(0);
                position.setY(0);
            })
            .setSize((size) => {
                size.setWidth(EvenBetterElementSize.MAX_WIDTH);
                size.setHeight(EvenBetterElementSize.MAX_HEIGHT);
            })
            .markAsEventCaptureElement();

        paginationElement.current
            .setPosition((position) => {
                position.setX(0);
                position.setY(238);
            })
            .setSize((size) => {
                size.setWidth(EvenBetterElementSize.MAX_WIDTH);
                size.setHeight(50);
            });
    }, []);

    useEffect(() => {
        if (!hasPresentationStarted) {
            return;
        }

        paginationElement.current.setContent(formatPagination(currentSlide ?? 0, totalSlides ?? 0, presentationDurationMs ?? 0));

        speakerNotesElement.current.setContent(getSpeakerNotesContent());

        presentationPage.current.render();
    }, [formatPagination, currentSlide, totalSlides, presentationDurationMs, getSpeakerNotesContent, hasPresentationStarted]);


    useEffect(() => {
        if (!hasPresentationStarted) {
            return;
        }

        presentationPage.current.render();
    }, [hasPresentationStarted]);

    return (
        <Card>
            <CardHeader>
                {title ?? "No Title"}
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    {loading && (
                        <Badge>
                            Loading…
                        </Badge>
                    )}
                    <Badge>
                        {formatDuration(presentationDurationMs)}
                    </Badge>
                </div>
                <div className="whitespace-pre-line">
                    {speakerNote}
                </div>
            </CardContent>
            <CardFooter className="flex gap-3 mt-2">
                <Button
                    onClick={goToPreviousSlide}
                    disabled={loading}
                    variant="default"
                    className="flex-1"
                >
                    Previous
                </Button>
                <Button
                    onClick={goToNextSlide}
                    disabled={loading}
                    variant="primary"
                    className="flex-1"
                >
                    {loading ? "Loading…" : "Next"}
                </Button>
            </CardFooter>
        </Card>
    );
}