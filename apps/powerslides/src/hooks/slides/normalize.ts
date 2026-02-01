import type { SlidesPayload } from "./types";

export const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const normalizeSlideCode = (slideCode: string | null): string => {
  if (slideCode == null) {
    return "";
  }
  return String(slideCode).trim();
};

export const mergeSlidesPayload = (
  previous: SlidesPayload | null,
  next: SlidesPayload | null,
): SlidesPayload | null => {
  if (!next) {
    return null;
  }
  if (!previous) {
    return next;
  }
  return {
    ...previous,
    ...next,
    current_slide: next.current_slide ?? previous.current_slide,
    total_slide: next.total_slide ?? previous.total_slide,
    speaker_note: next.speaker_note ?? previous.speaker_note,
    showSpeakerNote: next.showSpeakerNote ?? previous.showSpeakerNote,
    timestamp: next.timestamp ?? previous.timestamp,
    title: next.title ?? previous.title,
    type: next.type ?? previous.type,
  };
};
