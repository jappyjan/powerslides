import { useCallback, useEffect, useState } from 'react';
import {
  createPairingSession,
  type PairingPayload,
  type PresentationData,
} from '@jappyjan/powerslides-shared';

type SlideCounts = {
  current: number | null;
  total: number | null;
};

type SlidesResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type RemoteSessionPayload = {
  slideId: string;
  password: string;
  pairingCode: string;
};

const SLIDES_URL_MATCH = 'docs.google.com/presentation/d/';

const getActiveTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    throw new Error('No active tab available.');
  }
  return tab;
};

const ensureSlidesTab = async () => {
  const tab = await getActiveTab();
  if (!tab.url || !tab.url.includes(SLIDES_URL_MATCH)) {
    throw new Error('Open a Google Slides deck to use these controls.');
  }
  return tab;
};

const sendToContentScript = async <T,>(tabId: number, type: string) =>
  new Promise<SlidesResponse<T>>((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type }, (response: SlidesResponse<T>) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(
          new Error(
            err.message || 'Unable to reach the Slides content script.'
          )
        );
        return;
      }
      resolve(response);
    });
  });

const sendRuntimeMessage = async <T,>(
  message: unknown,
  timeoutMs = 10000
) =>
  new Promise<SlidesResponse<T>>((resolve, reject) => {
    console.info('[powerslides-browser-extension] runtime message send', message);
    const timeoutId = window.setTimeout(() => {
      console.warn('[powerslides-browser-extension] runtime message timeout', message);
      reject(new Error('Background request timed out. Please try again.'));
    }, timeoutMs);
    chrome.runtime.sendMessage(message, (response: SlidesResponse<T>) => {
      const err = chrome.runtime.lastError;
      window.clearTimeout(timeoutId);
      if (err) {
        console.warn('[powerslides-browser-extension] runtime message error', err);
        reject(new Error(err.message || 'Unable to reach the extension background.'));
        return;
      }
      if (!response) {
        console.warn('[powerslides-browser-extension] runtime message empty response');
        reject(new Error('No response from the extension background.'));
        return;
      }
      console.info('[powerslides-browser-extension] runtime message response', response);
      resolve(response);
    });
  });

export const useGoogleSlides = () => {
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<SlideCounts>({ current: null, total: null });
  const [speakerNotes, setSpeakerNotes] = useState<string | null>(null);
  const [pairing, setPairing] = useState<PairingPayload | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingStatus, setPairingStatus] = useState('Not connected');
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPresentMode, setIsPresentMode] = useState(false);

  const requestState = useCallback(async () => {
    try {
      const tab = await ensureSlidesTab();
      await sendRuntimeMessage({
        type: 'REMOTE_REQUEST_STATE',
        payload: { tabId: tab.id },
      });
    } catch {
      // Ignore - popup may not have Slides tab
    }
  }, []);

  const startPresentationMode = useCallback(async () => {
    setStatus('Opening present mode...');
    setError(null);
    try {
      const tab = await ensureSlidesTab();
      const response = await sendToContentScript<unknown>(tab.id!, 'SLIDES_OPEN_PRESENT');
      if (!response.ok) throw new Error(response.error || 'Request failed.');
      setStatus('Ready');
    } catch (err) {
      setStatus('Error');
      setError(err instanceof Error ? err.message : 'Unknown error.');
    }
  }, []);

  const nextSlide = useCallback(async () => {
    const { current, total } = page;
    if (total !== null && current !== null && current >= total) {
      return;
    }
    setIsTransitioning(true);
    try {
      const tab = await ensureSlidesTab();
      const response = await sendRuntimeMessage({
        type: 'REMOTE_SEND_COMMAND',
        payload: pairing ? { type: 'next' } : { type: 'next', tabId: tab.id },
      });
      if (!response.ok) throw new Error(response.error);
    } finally {
      setIsTransitioning(false);
    }
  }, [page, pairing]);

  const previousSlide = useCallback(async () => {
    const { current } = page;
    if (current !== null && current <= 1) {
      return;
    }
    setIsTransitioning(true);
    try {
      const tab = await ensureSlidesTab();
      const response = await sendRuntimeMessage({
        type: 'REMOTE_SEND_COMMAND',
        payload: pairing ? { type: 'previous' } : { type: 'previous', tabId: tab.id },
      });
      if (!response.ok) throw new Error(response.error);
    } finally {
      setIsTransitioning(false);
    }
  }, [page, pairing]);

  useEffect(() => {
    const checkPresentMode = async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        setIsPresentMode(Boolean(tab?.url?.includes('/present')));
      } catch {
        setIsPresentMode(false);
      }
    };
    checkPresentMode();
    const intervalId = window.setInterval(checkPresentMode, 2000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    requestState();
    const intervalId = window.setInterval(() => {
      if (!pairing) {
        requestState();
      }
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, [requestState, pairing]);

  const syncSessionState = useCallback(async () => {
    try {
      const response = await sendRuntimeMessage<{
        session: RemoteSessionPayload | null;
      }>({
        type: 'REMOTE_GET_SESSION',
      });
      if (response?.ok && response.data?.session) {
        setPairing({
          slideId: response.data.session.slideId,
          password: response.data.session.password,
        });
        setPairingCode(response.data.session.pairingCode);
        setPairingStatus('Connected');
      } else {
        setPairing(null);
        setPairingCode(null);
        setPairingStatus('Not connected');
      }
    } catch (err) {
      setPairingError(err instanceof Error ? err.message : 'Unknown error.');
    }
  }, []);

  const startRemoteSession = useCallback(async () => {
    setPairingError(null);
    try {
      const tab = await ensureSlidesTab();
      const pairingSession = createPairingSession();
      const { payload, code } = pairingSession;
      setPairingStatus('Starting...');
      const response = await sendRuntimeMessage({
        type: 'REMOTE_START_SESSION',
        payload: {
          slideId: payload.slideId,
          password: payload.password,
          tabId: tab.id,
          pairingCode: code,
        },
      });
      if (!response.ok) {
        throw new Error(response.error || 'Unable to start session.');
      }
      setPairing({ slideId: payload.slideId, password: payload.password });
      setPairingCode(code);
      setPairingStatus('Connected');
    } catch (err) {
      setPairingStatus('Error');
      setPairingError(err instanceof Error ? err.message : 'Unknown error.');
    }
  }, []);

  const stopRemoteSession = useCallback(async () => {
    setPairingError(null);
    try {
      const response = await sendRuntimeMessage({
        type: 'REMOTE_STOP_SESSION',
      });
      if (!response.ok) {
        throw new Error(response.error || 'Unable to stop session.');
      }
      setPairing(null);
      setPairingCode(null);
      setPairingStatus('Not connected');
    } catch (err) {
      setPairingStatus('Error');
      setPairingError(err instanceof Error ? err.message : 'Unknown error.');
    }
  }, []);

  const applyStateUpdate = useCallback((state: PresentationData) => {
    if (state.current != null || state.total != null) {
      setPage({
        current: state.current ?? null,
        total: state.total ?? null,
      });
    }
    if (state.speakerNote !== undefined) {
      const htmlWithBreaks = String(state.speakerNote || '')
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\/\s*p\s*>/gi, '\n')
        .replace(/<\/\s*div\s*>/gi, '\n')
        .replace(/<\/\s*li\s*>/gi, '\n');
      const text =
        typeof DOMParser !== 'undefined'
          ? (new DOMParser().parseFromString(htmlWithBreaks, 'text/html').body.textContent ?? '')
              .replace(/\n{3,}/g, '\n\n')
              .trim()
          : htmlWithBreaks.replace(/<[^>]+>/g, '');
      setSpeakerNotes(text || null);
    }
  }, []);

  useEffect(() => {
    syncSessionState();
    const handleMessage = (message: {
      type?: string;
      session?: RemoteSessionPayload | null;
      state?: PresentationData;
    }) => {
      if (message?.type === 'REMOTE_SESSION_UPDATED') {
        if (message.session) {
          setPairing({
            slideId: message.session.slideId,
            password: message.session.password,
          });
          setPairingCode(message.session.pairingCode);
          setPairingStatus('Connected');
        } else {
          setPairing(null);
          setPairingCode(null);
          setPairingStatus('Not connected');
        }
      } else if (message?.type === 'REMOTE_STATE_UPDATED' && message.state) {
        applyStateUpdate(message.state);
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [syncSessionState, applyStateUpdate]);

  return {
    status,
    error,
    page,
    speakerNotes,
    pairing,
    pairingCode,
    pairingStatus,
    pairingError,
    isTransitioning,
    isPresentMode,
    startPresentationMode,
    nextSlide,
    previousSlide,
    startRemoteSession,
    stopRemoteSession,
  };
};
