import type { PairingPayload, SlideState } from '@jappyjan/powerslides-shared';

export type UseSlidesRemoteOptions = {
  pairing: PairingPayload | null;
};

export type UseSlidesRemoteResult = {
  loading: boolean;
  error: string | null;
  currentSlide: SlideState['current'];
  totalSlides: SlideState['total'];
  speakerNote: SlideState['speakerNote'];
  title: SlideState['title'];
  presentationDurationMs: number | null;
  refresh: () => Promise<void>;
  goToNextSlide: () => Promise<void>;
  goToPreviousSlide: () => Promise<void>;
  startPresentation: () => Promise<void>;
  debugLogs: string[];
};
