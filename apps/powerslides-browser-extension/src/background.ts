import type {
  SlideCommand,
  SlideCommandType,
  PresentationData,
  WsCommandMessage,
  WsMessage,
  WsStateMessage,
} from '@jappyjan/powerslides-shared';

type RemoteSession = {
  slideId: string;
  password: string;
  tabId: number;
  startedAt: number;
  pairingCode: string;
};

type RuntimeResponse<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL as string | undefined;
const SOCKET_RECONNECT_BASE_DELAY_MS = 1000;
const SOCKET_RECONNECT_MAX_DELAY_MS = 10000;

console.info('[powerslides-browser-extension] background service worker loaded');

let socket: WebSocket | null = null;
let socketReady = false;
let reconnectTimeoutId: number | null = null;
let reconnectAttempts = 0;
let pollIntervalId: number | null = null;
let session: RemoteSession | null = null;
let presentationStartedAt: number | null = null;
let lastState: PresentationData | null = null;
const seenCommands = new Set<string>();
const SESSION_STORAGE_KEY = 'remoteSession';
const tabInjectionAttempts = new Map<number, number>();
const tabInjectionPromises = new Map<number, Promise<void>>();

const getWebSocketUrl = () => {
  if (!WEBSOCKET_URL) {
    console.warn('[powerslides-browser-extension] missing WebSocket config');
    throw new Error('Missing WebSocket configuration.');
  }
  return WEBSOCKET_URL;
};

const sendToTabOnce = async <T,>(
  tabId: number,
  message: { type: string }
): Promise<RuntimeResponse<T>> =>
  new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: RuntimeResponse<T>) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message || 'Unable to reach content script.'));
        return;
      }
      resolve(response);
    });
  });

const getContentScriptFile = (): string | null => {
  const manifest = chrome.runtime.getManifest();
  const files = manifest.content_scripts?.[0]?.js ?? [];
  return files[0] ?? null;
};

const ensureContentScript = async (tabId: number) => {
  const inflight = tabInjectionPromises.get(tabId);
  if (inflight) {
    await inflight;
    return;
  }

  const injectionPromise = (async () => {
    const lastAttemptAt = tabInjectionAttempts.get(tabId) ?? 0;
    const now = Date.now();
    if (now - lastAttemptAt < 5000) {
      return;
    }
    tabInjectionAttempts.set(tabId, now);

    const file = getContentScriptFile();
    if (!file) {
      throw new Error('No content script file found in manifest.');
    }

    if (file.endsWith('.ts')) {
      console.info('[powerslides-browser-extension] loading content script module', {
        tabId,
        file,
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        func: async (path: string) => {
          await import(chrome.runtime.getURL(path));
        },
        args: [file],
      });
      return;
    }

    console.info('[powerslides-browser-extension] injecting content script', { tabId, file });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [file],
    });
  })();

  tabInjectionPromises.set(tabId, injectionPromise);
  try {
    await injectionPromise;
  } finally {
    tabInjectionPromises.delete(tabId);
  }
};

const sendToTabWithRetry = async <T,>(
  tabId: number,
  message: { type: string }
): Promise<RuntimeResponse<T>> => {
  try {
    return await sendToTabOnce<T>(tabId, message);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    if (messageText.includes('Receiving end does not exist')) {
      await ensureContentScript(tabId);
      return await sendToTabOnce<T>(tabId, message);
    }
    throw error;
  }
};

const sendToTab = async <T,>(
  tabId: number,
  message: { type: string }
): Promise<RuntimeResponse<T>> => {
  try {
    return await sendToTabWithRetry<T>(tabId, message);
  } catch (error) {
    console.warn('[powerslides-browser-extension] content script inject failed', error);
    throw error;
  }
};

const clearReconnectTimeout = () => {
  if (reconnectTimeoutId) {
    self.clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }
};

const closeSocket = () => {
  clearReconnectTimeout();
  if (socket) {
    try {
      socket.close();
    } catch (error) {
      console.warn('[powerslides-browser-extension] socket close failed', error);
    }
  }
  socket = null;
  socketReady = false;
};

const scheduleReconnect = () => {
  if (!session) {
    return;
  }
  clearReconnectTimeout();
  const delay = Math.min(
    SOCKET_RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempts,
    SOCKET_RECONNECT_MAX_DELAY_MS
  );
  reconnectAttempts += 1;
  reconnectTimeoutId = self.setTimeout(() => {
    if (session) {
      connectSocket(session.slideId, session.password);
    }
  }, delay);
  console.info('[powerslides-browser-extension] scheduled reconnect', { delay });
};

const sendSocketMessage = (message: WsMessage) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('[powerslides-browser-extension] socket not ready, drop message', message.type);
    return;
  }
  socket.send(JSON.stringify(message));
};

const startPresentation = async (reason: string) => {
  if (!session) {
    console.warn('[powerslides-browser-extension] start presentation skipped: no session', { reason });
    return;
  }
  if (presentationStartedAt) {
    return;
  }
  presentationStartedAt = Date.now();
  console.info('[powerslides-browser-extension] presentation started', { reason, presentationStartedAt });
  await publishState(session.tabId);
};

const connectSocket = (slideId: string, password: string) => {
  const url = getWebSocketUrl();
  closeSocket();
  socketReady = false;
  console.info('[powerslides-browser-extension] connecting websocket', { url });
  socket = new WebSocket(url);

  socket.addEventListener('open', () => {
    socketReady = true;
    reconnectAttempts = 0;
    console.info('[powerslides-browser-extension] websocket open');
    sendSocketMessage({ type: 'join', slideId, password, createRoom: true });
    if (session) {
      publishState(session.tabId);
    }
  });

  socket.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'string') {
      return;
    }
    let message: WsMessage | null = null;
    try {
      message = JSON.parse(event.data) as WsMessage;
    } catch (error) {
      console.warn('[powerslides-browser-extension] invalid websocket message', error);
      return;
    }
    if (message.type === 'command') {
      const payload = (message as WsCommandMessage).payload;
      if (!session || !payload || typeof payload.type !== 'string') {
        return;
      }
      console.info('[powerslides-browser-extension] command received', payload);
      const key = payload.id ?? `${payload.type}:${payload.at ?? 0}:${payload.from ?? ''}`;
      if (seenCommands.has(key)) {
        return;
      }
      if (typeof payload.at === 'number' && payload.at < session.startedAt) {
        return;
      }
      seenCommands.add(key);
      if (payload.type === 'start_presentation') {
        startPresentation('glasses');
        return;
      }
      handleCommand(payload, session.tabId);
    }
  });

  socket.addEventListener('close', () => {
    socketReady = false;
    console.info('[powerslides-browser-extension] websocket closed');
    scheduleReconnect();
  });

  socket.addEventListener('error', (error) => {
    console.warn('[powerslides-browser-extension] websocket error', error);
  });
};

const broadcastSessionUpdate = () => {
  chrome.runtime.sendMessage({
    type: 'REMOTE_SESSION_UPDATED',
    session,
    pairingCode: session ? session.pairingCode : null,
  });
};

const stopSession = async () => {
  if (pollIntervalId) {
    self.clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  closeSocket();
  session = null;
  presentationStartedAt = null;
  lastState = null;
  seenCommands.clear();
  await chrome.storage.session.remove(SESSION_STORAGE_KEY);
  broadcastSessionUpdate();
};

const handleCommand = async (command: SlideCommand, tabId: number) => {
  const typeMap: Partial<Record<SlideCommandType, string>> = {
    next: 'SLIDES_NEXT',
    previous: 'SLIDES_PREVIOUS',
    open_present: 'SLIDES_OPEN_PRESENT',
  };
  const messageType = typeMap[command.type];
  if (!messageType) {
    return;
  }
  try {
    await sendToTab(tabId, { type: messageType });
  } catch (error) {
    console.warn('[powerslides-browser-extension] command send failed', error);
  }
};

const publishState = async (tabId: number) => {
  if (!socket || !socketReady) {
    console.info('[powerslides-browser-extension] publish skipped: socket not ready');
    return;
  }
  try {
    const results = await Promise.allSettled([
      sendToTab<{ current: number | null; total: number | null }>(tabId, {
        type: 'SLIDES_GET_COUNTS',
      }),
      sendToTab<{ speakerNote: string | null }>(tabId, {
        type: 'SLIDES_GET_SPEAKER_NOTES',
      }),
      sendToTab<{ title: string | null }>(tabId, {
        type: 'SLIDES_GET_TITLE',
      }),
    ]);

    const countsResult = results[0];
    const notesResult = results[1];
    const titleResult = results[2];

    const counts =
      countsResult.status === 'fulfilled' && countsResult.value.ok
        ? countsResult.value.data
        : null;
    const notes =
      notesResult.status === 'fulfilled' && notesResult.value.ok
        ? notesResult.value.data
        : null;
    const title =
      titleResult.status === 'fulfilled' && titleResult.value.ok
        ? titleResult.value.data
        : null;

    if (!counts || !notes || !title) {
      console.warn('[powerslides-browser-extension] partial state read', {
        counts: Boolean(counts),
        notes: Boolean(notes),
        title: Boolean(title),
      });
    }

    const nextState: PresentationData = {
      current: counts?.current ?? lastState?.current ?? null,
      total: counts?.total ?? lastState?.total ?? null,
      speakerNote: notes?.speakerNote ?? lastState?.speakerNote ?? null,
      title: title?.title ?? lastState?.title ?? null,
      updatedAt: Date.now(),
      presentationStartedAt,
    };

    sendSocketMessage({ type: 'state', payload: nextState } satisfies WsStateMessage);
    lastState = nextState;
    console.info('[powerslides-browser-extension] state sent', {
      updatedAt: nextState.updatedAt,
    });
  } catch (error) {
    console.warn('[powerslides-browser-extension] state publish failed', error);
  }
};

const startSession = async (payload: {
  slideId: string;
  password: string;
  tabId: number;
  pairingCode: string;
}) => {
  console.info('[powerslides-browser-extension] starting session', {
    slideId: payload.slideId,
    tabId: payload.tabId,
    pairingCode: payload.pairingCode,
  });
  await stopSession();
  session = {
    slideId: payload.slideId,
    password: payload.password,
    tabId: payload.tabId,
    startedAt: Date.now(),
    pairingCode: payload.pairingCode,
  };
  presentationStartedAt = null;
  lastState = null;
  connectSocket(payload.slideId, payload.password);
  await chrome.storage.session.set({ [SESSION_STORAGE_KEY]: session });
  await publishState(payload.tabId);
  console.info('[powerslides-browser-extension] initial state sent');
  pollIntervalId = self.setInterval(() => {
    if (!session) {
      return;
    }
    publishState(session.tabId);
  }, 2000);

  broadcastSessionUpdate();
  console.info('[powerslides-browser-extension] session started');
};

const restoreSession = async () => {
  const stored = await chrome.storage.session.get([SESSION_STORAGE_KEY, 'session']);
  const storedSession = (stored[SESSION_STORAGE_KEY] ?? stored.session) as
    | RemoteSession
    | undefined;
  if (!storedSession || !storedSession.pairingCode) {
    if (storedSession) {
      await chrome.storage.session.remove(SESSION_STORAGE_KEY);
    }
    return;
  }
  if (stored.session) {
    await chrome.storage.session.remove('session');
  }
  try {
    await chrome.tabs.get(storedSession.tabId);
    await startSession({
      slideId: storedSession.slideId,
      password: storedSession.password,
      tabId: storedSession.tabId,
      pairingCode: storedSession.pairingCode,
    });
  } catch {
    await chrome.storage.session.remove('session');
  }
};

chrome.runtime.onInstalled.addListener(() => {
  console.info('[powerslides-browser-extension] installed');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'REMOTE_START_SESSION') {
    const payload = message.payload as {
      slideId?: string;
      password?: string;
      tabId?: number;
      pairingCode?: string;
    };
    if (!payload?.slideId || !payload?.password || !payload?.tabId || !payload?.pairingCode) {
      sendResponse({ ok: false, error: 'Missing session payload.' });
      return false;
    }
    startSession({
      slideId: payload.slideId,
      password: payload.password,
      tabId: payload.tabId,
      pairingCode: payload.pairingCode,
    })
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error: Error) => {
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message?.type === 'REMOTE_STOP_SESSION') {
    stopSession()
      .then(() => sendResponse({ ok: true }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'REMOTE_START_PRESENTATION') {
    startPresentation('popup')
      .then(() => sendResponse({ ok: true }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'REMOTE_GET_SESSION') {
    sendResponse({
      ok: true,
      data: {
        session,
        pairingCode: session ? session.pairingCode : null,
      },
    });
    return false;
  }

  return false;
});

restoreSession().catch((error) => {
  console.warn('[powerslides-browser-extension] failed to restore session', error);
});
