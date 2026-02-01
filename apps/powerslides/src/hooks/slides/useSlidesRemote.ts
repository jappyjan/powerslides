import { useCallback, useEffect, useRef, useState } from "react";

import {
  createCommandId,
  type SlideCommandType,
  type SlideState,
  type WsMessage,
  type WsStateMessage,
} from "@jappyjan/powerslides-shared";

import type { UseSlidesRemoteOptions, UseSlidesRemoteResult } from "./types";

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL as string | undefined;

const logDebug = (message: string, data?: unknown) => {
  if (data !== undefined) {
    console.info(`[evenhub-remote] ${message}`, data);
    return;
  }
  console.info(`[evenhub-remote] ${message}`);
};

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

const normalizeState = (data: unknown): SlideState | null => {
  if (!data || typeof data !== "object") {
    return null;
  }
  const payload = data as Partial<SlideState>;
  return {
    current: normalizeNumber(payload.current),
    total: normalizeNumber(payload.total),
    speakerNote: typeof payload.speakerNote === "string" ? payload.speakerNote : null,
    title: typeof payload.title === "string" ? payload.title : null,
    updatedAt: normalizeNumber(payload.updatedAt),
    presentationStartedAt: normalizeNumber(payload.presentationStartedAt),
  };
};

export function useSlidesRemote(options: UseSlidesRemoteOptions): UseSlidesRemoteResult {
  const { pairing } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SlideState | null>(null);
  const [presentationDurationMs, setPresentationDurationMs] = useState<number | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const stateRef = useRef<SlideState | null>(null);
  const loadingRef = useRef(false);
  const isMountedRef = useRef(true);
  const socketRef = useRef<WebSocket | null>(null);
  const socketReadyRef = useRef(false);
  const reconnectTimeoutIdRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const refreshTimeoutIdRef = useRef<number | null>(null);
  const setupIdRef = useRef(0);

  const websocketConfigError = !WEBSOCKET_URL ? "Missing WebSocket configuration." : null;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const addDebugLog = useCallback((message: string, data?: unknown) => {
    const line = data !== undefined ? `${message} ${JSON.stringify(data)}` : message;
    setDebugLogs((prev) => [...prev.slice(-199), line]);
    logDebug(message, data);
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutIdRef.current) {
      window.clearTimeout(reconnectTimeoutIdRef.current);
      reconnectTimeoutIdRef.current = null;
    }
  }, []);

  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutIdRef.current) {
      window.clearTimeout(refreshTimeoutIdRef.current);
      refreshTimeoutIdRef.current = null;
    }
  }, []);

  const startLoadingWait = useCallback(
    (reason: string) => {
      addDebugLog("Waiting for state", { reason });
      setLoading(true);
      clearRefreshTimeout();
      refreshTimeoutIdRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          addDebugLog("Loading timeout waiting for state", { reason });
          setLoading(false);
        }
      }, 3000);
    },
    [addDebugLog, clearRefreshTimeout]
  );

  const closeSocket = useCallback(() => {
    clearReconnectTimeout();
    socketReadyRef.current = false;
    const socket = socketRef.current;
    if (socket) {
      socket.removeEventListener("close", () => undefined);
      socket.removeEventListener("message", () => undefined);
      socket.removeEventListener("open", () => undefined);
      socket.removeEventListener("error", () => undefined);
      socket.close();
    }
    socketRef.current = null;
  }, [clearReconnectTimeout]);

  const sendSocketMessage = useCallback(
    (message: WsMessage) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        addDebugLog("Socket not ready, drop message", message.type);
        return;
      }
      socket.send(JSON.stringify(message));
    },
    [addDebugLog]
  );

  const sendJoin = useCallback(() => {
    if (!pairing) {
      return;
    }
    sendSocketMessage({ type: "join", pairingCode: pairing.slideId });
  }, [pairing, sendSocketMessage]);

  useEffect(() => {
    addDebugLog("WebSocket config", { hasUrl: Boolean(WEBSOCKET_URL) });
    return () => {
      isMountedRef.current = false;
    };
  }, [addDebugLog]);

  const refresh = useCallback(async () => {
    addDebugLog("Refresh requested");
    startLoadingWait("refresh");
    sendJoin();
  }, [addDebugLog, sendJoin, startLoadingWait]);

  const sendCommand = useCallback(
    async (type: SlideCommandType) => {
      if (!socketReadyRef.current) {
        addDebugLog("Command skipped: socket not ready", type);
        return;
      }
      if (loadingRef.current) {
        addDebugLog("Command skipped: loading in progress", type);
        return;
      }
      startLoadingWait(`command:${type}`);
      sendSocketMessage({
        type: "command",
        payload: { id: createCommandId(), type, at: Date.now(), from: "evenhub" },
      });
      addDebugLog("Command sent", { type });
    },
    [addDebugLog, sendSocketMessage, startLoadingWait]
  );

  const goToNextSlide = useCallback(async () => {
    await sendCommand("next");
  }, [sendCommand]);

  const goToPreviousSlide = useCallback(async () => {
    await sendCommand("previous");
  }, [sendCommand]);

  const startPresentation = useCallback(async () => {
    await sendCommand("start_presentation");
  }, [sendCommand]);

  const getPresentationDuration = useCallback(() => {
    const timestamp = stateRef.current?.presentationStartedAt ?? null;
    if (!timestamp) {
      return null;
    }
    return Date.now() - timestamp;
  }, []);

  useEffect(() => {
    if (!pairing) {
      setPresentationDurationMs(null);
      return;
    }

    setPresentationDurationMs(getPresentationDuration());
    const intervalId = window.setInterval(() => {
      setPresentationDurationMs(getPresentationDuration());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [getPresentationDuration, pairing]);

  useEffect(() => {
    if (!pairing) {
      addDebugLog("Pairing cleared");
      setError(null);
      setState(null);
      setPresentationDurationMs(null);
      setLoading(false);
      clearRefreshTimeout();
      closeSocket();
      return;
    }

    if (websocketConfigError) {
      addDebugLog("WebSocket config error", websocketConfigError);
      setError(websocketConfigError);
      setLoading(false);
      return;
    }

    const setupId = setupIdRef.current + 1;
    setupIdRef.current = setupId;
    setLoading(true);
    setError(null);
    clearRefreshTimeout();

    const connect = () => {
      if (!isMountedRef.current || setupId !== setupIdRef.current) {
        return;
      }
      closeSocket();
      const socket = new WebSocket(WEBSOCKET_URL!);
      socketRef.current = socket;
      socketReadyRef.current = false;

      socket.addEventListener("open", () => {
        if (!isMountedRef.current || setupId !== setupIdRef.current) {
          return;
        }
        socketReadyRef.current = true;
        reconnectAttemptRef.current = 0;
        addDebugLog("WebSocket open");
        sendJoin();
      });

      socket.addEventListener("message", (event) => {
        if (!isMountedRef.current || setupId !== setupIdRef.current) {
          return;
        }
        if (!event.data || typeof event.data !== "string") {
          return;
        }
        let message: WsMessage | null = null;
        try {
          message = JSON.parse(event.data) as WsMessage;
        } catch (err) {
          addDebugLog("Invalid socket message", err);
          return;
        }
        if (message.type === "state") {
          const payload = (message as WsStateMessage).payload;
          addDebugLog("State received", payload);
          const next = normalizeState(payload);
          if (next) {
            setState(next);
            setLoading(false);
            clearRefreshTimeout();
          }
        }
      });

      socket.addEventListener("close", () => {
        if (!isMountedRef.current || setupId !== setupIdRef.current) {
          return;
        }
        socketReadyRef.current = false;
        addDebugLog("WebSocket closed");
        const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 10000);
        reconnectAttemptRef.current += 1;
        clearReconnectTimeout();
        reconnectTimeoutIdRef.current = window.setTimeout(connect, delay);
      });

      socket.addEventListener("error", (err) => {
        if (!isMountedRef.current || setupId !== setupIdRef.current) {
          return;
        }
        addDebugLog("WebSocket error", err);
      });
    };

    connect();

    return () => {
      setupIdRef.current += 1;
      clearReconnectTimeout();
      clearRefreshTimeout();
      closeSocket();
    };
  }, [
    addDebugLog,
    clearReconnectTimeout,
    clearRefreshTimeout,
    closeSocket,
    pairing,
    sendJoin,
    websocketConfigError,
  ]);

  return {
    loading,
    error,
    currentSlide: state?.current ?? null,
    totalSlides: state?.total ?? null,
    speakerNote: state?.speakerNote ?? null,
    title: state?.title ?? null,
    presentationDurationMs,
    refresh,
    goToNextSlide,
    goToPreviousSlide,
    startPresentation,
    debugLogs,
  };
}
