console.info('[powerslides-browser-extension] content script injected');

const SLIDES_HOST = 'docs.google.com';
const SLIDES_PATH_PREFIX = '/presentation/d/';
const VIEWER_DATA_EVENT = 'slide-control-viewer-data';

const isSlidesDeckPage = () =>
  window.location.host === SLIDES_HOST &&
  window.location.pathname.startsWith(SLIDES_PATH_PREFIX);

const isEditMode = () => window.location.href.includes('/edit');
const isPresentMode = () => window.location.href.includes('/present');

const findSlideCountElement = () =>
  (document.querySelector('.goog-flat-menu-button-caption') ||
    document.querySelector('.docs-material-menu-button-flat-default-caption')) as
  | HTMLElement
  | null;

const getSlideCounts = () => {
  const el = findSlideCountElement();
  if (!el) return { current: null, total: null };
  const current = parseInt(el.getAttribute('aria-posinset') || '', 10);
  const total = parseInt(el.getAttribute('aria-setsize') || '', 10);
  return {
    current: Number.isNaN(current) ? null : current,
    total: Number.isNaN(total) ? null : total,
  };
};

const goSlide = (direction: 'next' | 'previous') => {
  const key = direction === 'next' ? 'right' : 'left';
  document.dispatchEvent(new KeyboardEvent('keydown', { key }));
};

const injectPresentLink = () => {
  if (!isEditMode()) return;
  if (document.getElementById('slide-control-present-link')) return;

  const container = document.querySelector('.punch-start-presentation-container');
  if (!container) return;

  const link = document.createElement('a');
  link.id = 'slide-control-present-link';
  link.textContent = 'Present w/ Remote';
  link.href = window.location.href.replace('/edit', '/present');
  link.target = '_blank';
  link.style.cssText = [
    'margin-right: 8px',
    'padding: 0 10px',
    'height: 32px',
    'display: inline-flex',
    'align-items: center',
    'border-radius: 6px',
    'background: #1a73e8',
    'color: #fff',
    'font-size: 12px',
    'font-family: system-ui, sans-serif',
    'text-decoration: none',
  ].join(';');

  container.before(link);
};

const getSpeakerNotes = async () => {
  if (!isSlidesDeckPage()) {
    return { ok: false, error: 'Not on a Google Slides deck page.' };
  }

  const slideCounts = getSlideCounts();
  if (!slideCounts.current) {
    return { ok: false, error: 'Unable to determine current slide index.' };
  }

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('getViewerDataScript.js');

  const viewerData = await new Promise<unknown>((resolve, reject) => {
    let timeoutId: number | null = null;

    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      cleanup();
      resolve(customEvent.detail);
    };

    const cleanup = () => {
      document.removeEventListener(VIEWER_DATA_EVENT, handleEvent);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      script.remove();
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timed out reading viewer data.'));
    }, 1500);

    document.addEventListener(VIEWER_DATA_EVENT, handleEvent, { once: true });
    (document.head || document.documentElement).appendChild(script);
  }).catch((error: Error) => {
    return { error: error.message };
  });

  if (
    typeof viewerData === 'object' &&
    viewerData !== null &&
    'error' in viewerData
  ) {
    return { ok: false, error: viewerData.error as string };
  }

  const slideIndex = slideCounts.current - 1;
  const docData = (viewerData as { docData?: unknown[] }).docData;
  const speakerNote =
    Array.isArray(docData) &&
      Array.isArray(docData[1]) &&
      Array.isArray(docData[1][slideIndex])
      ? (docData[1][slideIndex] as unknown[])[9] ?? null
      : null;

  return { ok: true, data: { speakerNote } };
};

const getSlideTitle = () => {
  if (!isSlidesDeckPage()) {
    return { ok: false, error: 'Not on a Google Slides deck page.' };
  }
  const rawTitle = document.title || '';
  const title = rawTitle.replace(/\s+-\s+Google Slides\s*$/i, '').trim();
  return { ok: true, data: { title: title || null } };
};

if (isSlidesDeckPage()) {
  injectPresentLink();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const respond = (payload: { ok: boolean; data?: unknown; error?: string }) => {
    sendResponse(payload);
  };

  if (!isSlidesDeckPage()) {
    respond({ ok: false, error: 'Not on a Google Slides deck page.' });
    return false;
  }

  switch (message?.type) {
    case 'SLIDES_OPEN_PRESENT': {
      if (!isEditMode()) {
        respond({ ok: false, error: 'Present mode can only be opened from edit.' });
        return false;
      }
      window.open(window.location.href.replace('/edit', '/present'), '_blank');
      respond({ ok: true });
      return false;
    }
    case 'SLIDES_NEXT': {
      if (!isPresentMode()) {
        respond({ ok: false, error: 'Next/previous only works in present mode.' });
        return false;
      }
      goSlide('next');
      respond({ ok: true });
      return false;
    }
    case 'SLIDES_PREVIOUS': {
      if (!isPresentMode()) {
        respond({ ok: false, error: 'Next/previous only works in present mode.' });
        return false;
      }
      goSlide('previous');
      respond({ ok: true });
      return false;
    }
    case 'SLIDES_GET_COUNTS': {
      respond({ ok: true, data: getSlideCounts() });
      return false;
    }
    case 'SLIDES_GET_SPEAKER_NOTES': {
      getSpeakerNotes()
        .then((result) => {
          respond(result);
        })
        .catch((error: Error) => {
          respond({ ok: false, error: error.message });
        });
      return true;
    }
    case 'SLIDES_GET_TITLE': {
      respond(getSlideTitle());
      return false;
    }
    default: {
      respond({ ok: false, error: 'Unknown message type.' });
      return false;
    }
  }
});
