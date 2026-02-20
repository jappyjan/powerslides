import { useCallback, useEffect, useState } from 'react';
import {
  createPairingSession,
  type PairingPayload,
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

const sendMessage = async <T,>(type: string) => {
  const tab = await ensureSlidesTab();
  return new Promise<SlidesResponse<T>>((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id!, { type }, (response: SlidesResponse<T>) => {
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
};

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

  const runAction = useCallback(
    async <T,>(
      label: string,
      type: string,
      onData?: (data: T | undefined) => void,
      options?: { silent?: boolean }
    ) => {
      if (!options?.silent) {
        setStatus(label);
        setError(null);
      }
      try {
        const response = await sendMessage<T>(type);
        if (!response.ok) {
          throw new Error(response.error || 'Request failed.');
        }
        onData?.(response.data);
        if (!options?.silent) {
          setStatus('Ready');
        }
      } catch (err) {
        if (!options?.silent) {
          setStatus('Error');
          setError(err instanceof Error ? err.message : 'Unknown error.');
        }
      }
    },
    []
  );

  const startPresentationMode = useCallback(
    () => runAction('Opening present mode...', 'SLIDES_OPEN_PRESENT'),
    [runAction]
  );

  const refreshAll = useCallback(
    async (options?: { silent?: boolean }) => {
      await Promise.all([
        runAction<{ current: number | null; total: number | null }>(
          'Reading slide counts...',
          'SLIDES_GET_COUNTS',
          (data) => {
            if (data) {
              setPage({
                current: data.current ?? null,
                total: data.total ?? null,
              });
            }
          },
          options
        ),
        runAction<{ speakerNote: string | null }>(
          'Reading speaker notes...',
          'SLIDES_GET_SPEAKER_NOTES',
          (htmlSpeakerNotes) => {
            // Preserve common block/line break tags before stripping HTML.
            const htmlWithBreaks = String(htmlSpeakerNotes?.speakerNote || '')
              .replace(/<\s*br\s*\/?>/gi, '\n')
              .replace(/<\/\s*p\s*>/gi, '\n')
              .replace(/<\/\s*div\s*>/gi, '\n')
              .replace(/<\/\s*li\s*>/gi, '\n');

            if (typeof DOMParser === 'undefined') {
              setSpeakerNotes(htmlWithBreaks.replace(/<[^>]+>/g, ''));
              return;
            }

            const doc = new DOMParser().parseFromString(htmlWithBreaks, 'text/html');
            const text = doc.body.textContent ?? '';
            const plainTextSpeakerNotes = text
              .replace(/\n{3,}/g, '\n\n')
              .trim();

            setSpeakerNotes(plainTextSpeakerNotes);
          },
          options
        ),
      ]);
    },
    [runAction]
  );

  const nextSlide = useCallback(async () => {
    await runAction('Advancing slide...', 'SLIDES_NEXT');
    await refreshAll({ silent: true });
  }, [runAction, refreshAll]);

  const previousSlide = useCallback(async () => {
    await runAction('Going to previous slide...', 'SLIDES_PREVIOUS');
    await refreshAll({ silent: true });
  }, [runAction, refreshAll]);

  useEffect(() => {
    refreshAll({ silent: true });
    const intervalId = window.setInterval(() => {
      refreshAll({ silent: true });
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, [refreshAll]);

  const syncSessionState = useCallback(async () => {
    try {
      const response = await sendRuntimeMessage<{ session: RemoteSessionPayload | null }>({
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

  useEffect(() => {
    syncSessionState();
    const handleSessionUpdate = (message: {
      type?: string;
      session?: RemoteSessionPayload | null;
    }) => {
      if (message?.type !== 'REMOTE_SESSION_UPDATED') {
        return;
      }
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
    };
    chrome.runtime.onMessage.addListener(handleSessionUpdate);
    return () => chrome.runtime.onMessage.removeListener(handleSessionUpdate);
  }, [syncSessionState]);

  return {
    status,
    error,
    page,
    speakerNotes,
    pairing,
    pairingCode,
    pairingStatus,
    pairingError,
    startPresentationMode,
    nextSlide,
    previousSlide,
    startRemoteSession,
    stopRemoteSession,
  };
};
