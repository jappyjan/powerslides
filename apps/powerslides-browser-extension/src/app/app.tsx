import { useGoogleSlides } from './useGoogleSlides';

export function App() {
  const {
    status,
    error,
    page,
    speakerNotes,
    pairingCode,
    pairingStatus,
    pairingError,
    isTransitioning,
    startPresentationMode,
    nextSlide,
    previousSlide,
    startRemoteSession,
    stopRemoteSession,
  } = useGoogleSlides();

  return (
    <div className="popup">
      <header className="popup__header">
        <h1>Slide Control</h1>
        <p className="popup__subtitle">Google Slides tools</p>
      </header>
      <main className="popup__body">
        <section className="popup__section">
          <h2>Presenter actions</h2>
          <div className="popup__row">
            <button type="button" className="popup__button" onClick={startPresentationMode}>
              Open present mode
            </button>
          </div>
          <div className="popup__row">
            <button
              type="button"
              className="popup__button"
              onClick={previousSlide}
              disabled={isTransitioning || (page.current !== null && page.current <= 1)}
            >
              Previous slide
            </button>
            <button
              type="button"
              className="popup__button"
              onClick={nextSlide}
              disabled={isTransitioning || (page.current !== null && page.total !== null && page.current >= page.total)}
            >
              Next slide
            </button>
          </div>
        </section>

        <section className="popup__section">
          <h2>Remote pairing</h2>
          <div className="popup__row">
            <button type="button" className="popup__button" onClick={startRemoteSession}>
              Start remote session
            </button>
            <button type="button" className="popup__button" onClick={stopRemoteSession}>
              Stop remote session
            </button>
          </div>
          <div className="popup__card">
            <p>Status: {pairingStatus}</p>
            {pairingCode ? (
              <div className="popup__qr">
                <p className="popup__note">Enter this code in the Even Hub app.</p>
                <p className="popup__pairing-text">{pairingCode}</p>
              </div>
            ) : (
              <p className="popup__note">Start a session to show the pairing code.</p>
            )}
            {pairingError ? <p className="popup__error">{pairingError}</p> : null}
          </div>
        </section>

        <section className="popup__section">
          <h2>Slide info</h2>
          <div className="popup__card">
            <p>
              Current slide:{' '}
              <span className="popup__value">
                {page.current ?? '—'} / {page.total ?? '—'}
              </span>
              {isTransitioning && (
                <span className="popup__spinner" aria-hidden style={{ marginLeft: 8 }} />
              )}
            </p>
            <p className="popup__note">
              {speakerNotes ?? '—'}
            </p>
          </div>
        </section>

        <section className="popup__section popup__section--status">
          <p>Status: {status}</p>
          {error ? <p className="popup__error">{error}</p> : null}
        </section>
      </main>
    </div>
  );
}

export default App;
