import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  createCommandId,
  type SlideCommandType,
  type PresentationData,
  type WsMessage,
  type WsStateMessage,
  normalizePairingCode,
  parsePairingCodeResult,
  PairingPayload,
} from "@jappyjan/powerslides-shared";
import { useLogger } from "./hooks/useLogger";
import { EvenBetterSdk } from "@jappyjan/even-better-sdk";

const WEBSOCKET_URL =
  (import.meta.env.VITE_WEBSOCKET_URL as string | undefined) ||
  "wss://powerslides.apps.janjaap.de";

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeSpeakerNote = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const htmlWithBreaks = value
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
}

const normalizeState = (data: unknown): PresentationData | null => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Partial<PresentationData>;
  return {
    current: normalizeNumber(payload.current),
    total: normalizeNumber(payload.total),
    speakerNote: normalizeSpeakerNote(payload.speakerNote),
    title: typeof payload.title === "string" ? payload.title : null,
    updatedAt: normalizeNumber(payload.updatedAt),
  };
};

const TRANSITION_TIMEOUT_MS = 3000;

export type SlidesContextValue = {
  sdk: EvenBetterSdk;
  isConnected: boolean;
  connect: (pairingCode: string) => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  isTransitioning: boolean;
  currentSlide: number | null;
  totalSlides: number | null;
  speakerNote: string | null;
  title: string | null;
  goToNextSlide: () => Promise<void>;
  goToPreviousSlide: () => Promise<void>;
};

export const SlidesContext = createContext<SlidesContextValue>({
  sdk: null as unknown as EvenBetterSdk,
  isConnected: false,
  connect: async (_pairingCode: string) => { },
  disconnect: () => { },
  isConnecting: false,
  isTransitioning: false,
  currentSlide: null,
  totalSlides: null,
  speakerNote: null,
  title: null,
  goToNextSlide: async () => { },
  goToPreviousSlide: async () => { },
});

export interface SlidesContextProviderProps extends PropsWithChildren {
  sdkLogLevel?: "none" | "error" | "warn" | "info" | "debug";
}

export function SlidesContextProvider(props: SlidesContextProviderProps) {
  const { children, sdkLogLevel = "none" } = props;

  const { info: logInfo, error: logError, warn: logWarn, debug: logDebug } = useLogger();

  const sdk = useMemo(() => new EvenBetterSdk(), []);

  useEffect(() => {
    EvenBetterSdk.setLogLevel(sdkLogLevel);
  }, [sdkLogLevel]);

  useEffect(() => {
    EvenBetterSdk.logger = {
      info: (message: string) => logInfo('app', message),
      error: (message: string) => logError('sdk', message),
      warn: (message: string) => logWarn('sdk', message),
      debug: (message: string) => logDebug('sdk', message),
    }
  }, []);


  const value = useSlidesRemote(sdk);

  return (
    <SlidesContext.Provider value={{ ...value, sdk }}>
      {children}
    </SlidesContext.Provider>
  );
}

export function useSlidesContext(): SlidesContextValue {
  return useContext(SlidesContext);
}


function useSlidesRemote(sdk: EvenBetterSdk): Omit<SlidesContextValue, 'sdk'> {
  const [presentationData, setPresentationData] = useState<PresentationData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { info: logInfo, error: logError, warn: logWarn, debug: logDebug } = useLogger();

  const socketRef = useRef<WebSocket | null>(null);

  const clearTransitionTimeout = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  }, []);

  const sendSocketMessage = useCallback(
    (message: WsMessage) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        logError("slides-remote", `Socket not ready, drop message: ${message.type}`);
        return;
      }
      socket.send(JSON.stringify(message));
    },
    [logInfo]
  );

  const sendJoin = useCallback((pairing: PairingPayload) => {
    if (!pairing) {
      return;
    }
    sendSocketMessage({ type: "join", slideId: pairing.slideId, password: pairing.password, createRoom: false });
  }, [sendSocketMessage]);


  const sendCommand = useCallback(
    async (type: SlideCommandType) => {
      logDebug("slides-remote", `sending command: ${type}`);
      sendSocketMessage({
        type: "command",
        payload: { id: createCommandId(), type, at: Date.now(), from: "evenhub" },
      });
      logDebug("slides-remote", `Command sent: ${type}`);
    },
    [logInfo, sendSocketMessage]
  );

  const goToNextSlide = useCallback(async () => {
    const current = presentationData?.current ?? null;
    const total = presentationData?.total ?? null;
    if (total !== null && current !== null && current >= total) {
      return;
    }
    setIsTransitioning(true);
    clearTransitionTimeout();
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, TRANSITION_TIMEOUT_MS);
    await sendCommand("next");
  }, [sendCommand, clearTransitionTimeout, presentationData?.current, presentationData?.total]);

  const goToPreviousSlide = useCallback(async () => {
    const current = presentationData?.current ?? null;
    if (current !== null && current <= 1) {
      return;
    }
    setIsTransitioning(true);
    clearTransitionTimeout();
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, TRANSITION_TIMEOUT_MS);
    await sendCommand("previous");
  }, [sendCommand, clearTransitionTimeout, presentationData?.current]);

  const handleSocketMessage = useCallback((event: MessageEvent) => {
    if (!event.data || typeof event.data !== "string") {
      return false;
    }

    let message: WsMessage | null = null;
    try {
      message = JSON.parse(event.data) as WsMessage;
    } catch (err) {
      logWarn("slides-remote", `Invalid socket message: ${err}`);
      return false;
    }

    if (message.type !== "state") {
      return false;
    }

    const payload = (message as WsStateMessage).payload;
    const next = normalizeState(payload);
    if (!next) {
      return false;
    }

    setIsTransitioning(false);
    clearTransitionTimeout();
    setPresentationData(next);
    return true;
  }, [logWarn, clearTransitionTimeout]);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async (pairingCode: string) => {
    try {
      setIsConnecting(true);
      const normalizedPairingCode = normalizePairingCode(pairingCode);
      logInfo("pairing", `Connect clicked (length=${normalizedPairingCode.length})`);
      const parsedPairingCode = parsePairingCodeResult(pairingCode);

      if (!parsedPairingCode.payload) {
        if (parsedPairingCode.error === "expired") {
          logWarn("pairing", "Pairing code expired");
          throw new Error("Pairing code expired. Generate a new code in the extension.");
        }

        logWarn("pairing", `Pairing code invalid (${parsedPairingCode.error ?? "unknown"})`);
        throw new Error("Invalid pairing code. Enter the 12-character code.");
      }

      logInfo("pairing", `Pairing parsed (slideId=${parsedPairingCode.payload.slideId})`);

      logInfo("slides-remote", `Connecting to WebSocket: ${WEBSOCKET_URL}`);

      const socket = new WebSocket(WEBSOCKET_URL!);
      socketRef.current = socket;
      setIsConnected(false);

      socket.addEventListener("open", () => {
        if (!parsedPairingCode.payload) {
          logError("pairing", "Pairing code no longer available");
          disconnect();
          return;
        }
        logInfo("slides-remote", "WebSocket open");
        setIsConnected(false);
        sendJoin(parsedPairingCode.payload);
      });

      socket.addEventListener("error", (err) => {
        logError("slides-remote", `WebSocket error: ${err}`);
      });

      await new Promise<void>((resolve, reject) => {
        socket.addEventListener("message", (event) => {
          const handled = handleSocketMessage(event);
          setIsConnected((current) => {
            if (!current) {
              resolve();
            }

            return current || handled
          });
        });

        socket.addEventListener("close", () => {
          logInfo("slides-remote", "WebSocket closed");
          setIsConnected((current) => {
            if (!current) {
              logError("slides-remote", "Join failed");
              reject(new Error("Invalid Pairing Code"))
            }

            return false;
          });
        });
      });
      await sdk.setValue('pairingCode', pairingCode);
    } catch (err) {
      logError("pairing", `Failed to connect: ${err}`);
      setIsConnecting(false);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [logInfo, logError, sendJoin, handleSocketMessage, sdk, setIsConnecting]);

  const disconnect = useCallback(() => {
    clearTransitionTimeout();
    setIsTransitioning(false);
    const socket = socketRef.current;
    if (socket) {
      socket.removeEventListener("close", () => undefined);
      socket.removeEventListener("message", () => undefined);
      socket.removeEventListener("open", () => undefined);
      socket.removeEventListener("error", () => undefined);
      socket.close();
    }
    socketRef.current = null;
    setIsConnected(false);
  }, [clearTransitionTimeout]);

  useEffect(() => {
    if (isConnected) {
      return;
    }

    sdk.getValue('pairingCode').then((pairingCode) => {
      connect(pairingCode)
        .catch((err) => {
          logError("pairing", `Failed to re-connect to known pairing code: ${err}`);
          sdk.setValue('pairingCode', "");
        });
    });
  }, [isConnected, logError, connect, sdk])

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    isTransitioning,
    currentSlide: presentationData?.current ?? null,
    totalSlides: presentationData?.total ?? null,
    speakerNote: presentationData?.speakerNote ?? null,
    title: presentationData?.title ?? null,
    goToNextSlide,
    goToPreviousSlide,
  };
}
