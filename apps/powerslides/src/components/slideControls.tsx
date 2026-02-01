import { useBridgeState } from "../hooks/useBridgeState";
import { EvenHubEvent, OsEventTypeList, RebuildPageContainer, TextContainerProperty } from "@evenrealities/even_hub_sdk";
import { Badge, Button, Card, CardContent, CardFooter, CardHeader } from "@jappyjan/even-realities-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

export function SlideControls(props: Props) {
    const { loading, title, presentationDurationMs, speakerNote: speakerNoteHtml, goToNextSlide, goToPreviousSlide, startPresentation, totalSlides, currentSlide } = props;

    const { initialized: bridgeInitialized, bridge } = useBridgeState();

    // Helper to format duration as mm:ss
    const formatDuration = (ms: number | null) => {
        if (ms == null) return "--:--";
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

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
        return text.replace(/\n{3,}/g, "\n\n").trim();
    }, [speakerNoteHtml]);

    const speakerNotesContainerId = useMemo(() => 99, []);

    const [activeUpdates, setActiveUpdates] = useState(0);
    const hasPresentationStarted = presentationDurationMs !== null;
    const hasPresentationStartedRef = useRef(hasPresentationStarted);
    const loadingRef = useRef(loading);
    const activeUpdatesRef = useRef(activeUpdates);
    const startPresentationRef = useRef(startPresentation);
    const goToNextSlideRef = useRef(goToNextSlide);
    const goToPreviousSlideRef = useRef(goToPreviousSlide);

    const eventListenersRegistered = useRef(false);
    useEffect(() => {
        hasPresentationStartedRef.current = hasPresentationStarted;
    }, [hasPresentationStarted]);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        activeUpdatesRef.current = activeUpdates;
    }, [activeUpdates]);

    useEffect(() => {
        startPresentationRef.current = startPresentation;
    }, [startPresentation]);

    useEffect(() => {
        goToNextSlideRef.current = goToNextSlide;
        goToPreviousSlideRef.current = goToPreviousSlide;
    }, [goToNextSlide, goToPreviousSlide]);

    const [lastEvenhubEvent, setLastEvenhubEvent] = useState<EvenHubEvent | null>(null);

    useEffect(() => {
        if (!bridge || eventListenersRegistered.current) return;

        eventListenersRegistered.current = true;

        bridge.onEvenHubEvent((evt) => {
            setLastEvenhubEvent(evt);
        })
    }, [bridge]);

    useEffect(() => {
        if (!lastEvenhubEvent) return;

        if (!lastEvenhubEvent.textEvent) return;

        if (lastEvenhubEvent.textEvent.containerID !== speakerNotesContainerId) return;

        if (!hasPresentationStartedRef.current) {
            if (lastEvenhubEvent.textEvent.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
                startPresentationRef.current();
            }
            return;
        }

        if (loadingRef.current || activeUpdatesRef.current > 0) return;

        if (lastEvenhubEvent.textEvent.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
            goToNextSlideRef.current();
        } else if (lastEvenhubEvent.textEvent.eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
            goToPreviousSlideRef.current();
        }
    }, [lastEvenhubEvent]);

    const updateGlassesUi = useCallback(async () => {
        if (!bridgeInitialized || !bridge) {
            console.log('not updating glasses ui because bridge is not initialized or update is in progress');
            return;
        }


        setActiveUpdates(prev => prev + 1);

        while (!bridge.ready) {
            console.log('waiting for bridge to be ready');
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('updating glasses ui');

        const messageContainer = TextContainerProperty.fromJson({
            xPosition: 0,
            yPosition: 0,
            width: 576,
            height: 288,
            containerID: speakerNotesContainerId,
            containerName: 'speaker-notes',
            content: "double click to start presentation",
            isEventCapture: 1,
        } as Partial<TextContainerProperty>);

        const speakerNotesContainer = TextContainerProperty.fromJson({
            xPosition: 0,
            yPosition: 0,
            width: 576,
            height: 238,
            containerID: speakerNotesContainerId,
            containerName: 'speaker-notes',
            content: loading ? "Loading..." : speakerNote?.substring(0, 1500) ?? "No speaker note",
            isEventCapture: 1,
        } as Partial<TextContainerProperty>);

        console.log('currentSlide', currentSlide);
        console.log('totalSlides', totalSlides);
        const slidePageContainer = TextContainerProperty.fromJson({
            xPosition: 0,
            yPosition: 238,
            width: 576,
            height: 50,
            containerID: speakerNotesContainerId + 1,
            containerName: 'slide-page',
            content: `${currentSlide ?? 0} / ${totalSlides ?? 0} • ${formatDuration(presentationDurationMs)}`,
        } as Partial<TextContainerProperty>);

        const result = await bridge.rebuildPageContainer(RebuildPageContainer.fromJson({
            containerTotalNum: hasPresentationStarted ? 2 : 1,
            textObject: hasPresentationStarted
                ? [speakerNotesContainer, slidePageContainer]
                : [messageContainer],
        } as Partial<RebuildPageContainer>));

        console.log('udpate glasses ui result', result);

        await new Promise(resolve => setTimeout(resolve, 1000));

        setActiveUpdates(prev => prev - 1);
    }, [speakerNote, presentationDurationMs, bridgeInitialized, bridge, totalSlides, currentSlide, loading, hasPresentationStarted]);

    useEffect(() => {
        updateGlassesUi();
    }, [updateGlassesUi]);

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