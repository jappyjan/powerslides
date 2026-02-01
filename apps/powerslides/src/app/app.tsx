import { useCallback, useEffect, useRef, useState } from "react";
import {
  TextContainerProperty,
  CreateStartUpPageContainer,
} from '@evenrealities/even_hub_sdk';
import { useSlidesRemote } from "../hooks/slides/useSlidesRemote";
import { SlideCodeInput } from "../components/slideCodeInput";
import { Log } from "../components/log";
import { SlideControls } from "../components/slideControls";
import { useBridgeState } from "../hooks/useBridgeState";
import type { PairingPayload } from "@jappyjan/powerslides-shared";
import { Card, CardHeader, CardContent, Text } from '@jappyjan/even-realities-ui';

export function App() {
  const [logLines, setLogLines] = useState<string[]>([]);
  const [glassesInitialized, setGlassesInitialized] = useState(false);
  const [pairing, setPairing] = useState<PairingPayload | null>(null);
  const hasInitializedRef = useRef(false);

  const { initialize: initializeBridge } = useBridgeState();

  const log = (type: 'info' | 'error', message: string) => {
    console.log(`[${type}] ${message}`);
    setLogLines(prev => [...prev, `[${type}] ${message}`]);
  };

  const initGlasses = useCallback(async () => {
    try {
      log('info', 'initializing glasses...');

      const slideCodeMissingWarning = TextContainerProperty.fromJson({
        xPosition: 0,
        yPosition: 0,
        width: 576,
        height: 288,
        containerID: 1,
        containerName: 'text-2',
        content: 'Please enter pairing code in APP',
        isEventCapture: 1,
      });

      // Create startup page (max 4 containers)
      await initializeBridge(CreateStartUpPageContainer.fromJson({
        containerTotalNum: 1, // Maximum: 4
        textObject: [slideCodeMissingWarning],
      }));

      await new Promise(resolve => setTimeout(resolve, 2000));

      log('info', 'Glasses initialized');
      setGlassesInitialized(true);
    } catch (error) {
      log('error', `Error: ${error}`);
      setGlassesInitialized(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;
    setLogLines([]);
    setGlassesInitialized(false);
    initGlasses();
  }, []);

  const {
    title,
    presentationDurationMs,
    speakerNote,
    error,
    goToNextSlide,
    goToPreviousSlide,
    startPresentation,
    totalSlides,
    currentSlide,
    loading,
    debugLogs,
  } = useSlidesRemote({ pairing });

  if (!glassesInitialized) {
    return (

      <Card>
        <CardHeader>
          Initializing glasses...
        </CardHeader>
        <CardContent>
          <Log logLines={logLines} />
        </CardContent>
      </Card>

    );
  }

  return (
    <div>
      {(pairing && !error) ? (
        <SlideControls loading={loading} totalSlides={totalSlides} currentSlide={currentSlide} goToNextSlide={goToNextSlide} goToPreviousSlide={goToPreviousSlide} startPresentation={startPresentation} title={title} presentationDurationMs={presentationDurationMs} speakerNote={speakerNote} />
      ) : (
        <div>
          <SlideCodeInput pairing={pairing} setPairing={setPairing} />
          {error && (
            <Text variant="detail" className="text-red-500">
              {error}
            </Text>
          )}
        </div>
      )}
      <Log logLines={[...logLines, ...debugLogs]} />
    </div>
  );
}

export default App;
