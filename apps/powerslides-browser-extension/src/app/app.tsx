import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Text,
} from '@jappyjan/even-realities-ui';
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
    isPresentMode,
    startPresentationMode,
    nextSlide,
    previousSlide,
    startRemoteSession,
    stopRemoteSession,
  } = useGoogleSlides();

  const pagination =
    page.current !== null && page.total !== null
      ? `${page.current} / ${page.total}`
      : '— / —';

  return (
    <div className="flex flex-col gap-4 p-4 min-w-[320px] min-h-[320px]">
      <header>
        <Text variant="title-2" as="h1">
          PowerSlides
        </Text>
      </header>

      <main className="flex flex-col gap-4 flex-1">
        {/* Slide card */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Text variant="title-2">{pagination}</Text>
            {isTransitioning && (
              <span
                className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70"
                aria-hidden
              />
            )}
          </CardHeader>
          <CardContent className="whitespace-pre-line max-h-[120px] overflow-y-auto relative">
            {isTransitioning ? (
              <span className="flex items-center gap-2 text-gray-500">
                <span
                  className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
                  aria-hidden
                />
                Updating…
              </span>
            ) : (
              <Text variant="body-2">
                {speakerNotes?.trim() || '—'}
              </Text>
            )}
          </CardContent>
          <CardFooter className="flex gap-3 flex-row justify-between">
            <Button
              variant="default"
              onClick={previousSlide}
              disabled={
                isTransitioning ||
                (page.current !== null && page.current <= 1)
              }
            >
              Previous
            </Button>
            <Button
              variant="primary"
              onClick={nextSlide}
              disabled={
                isTransitioning ||
                (page.current !== null &&
                  page.total !== null &&
                  page.current >= page.total)
              }
            >
              Next
            </Button>
          </CardFooter>
        </Card>

        {/* Remote Control card */}
        <Card>
          <CardHeader>
            <Text variant="title-2">Remote Control</Text>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pairingCode ? (
              <>
                <Text variant="body-2">Pair with Even Hub</Text>
                <Text
                  variant="body-1"
                  className="font-mono tracking-wider break-all"
                >
                  {pairingCode}
                </Text>
              </>
            ) : (
              <Text variant="body-2">
                Start a session to get a pairing code.
              </Text>
            )}
            {pairingError && (
              <Text variant="detail" className="text-red-500">
                {pairingError}
              </Text>
            )}
          </CardContent>
          <CardFooter className="flex gap-3 flex-row">
            <Button variant="primary" onClick={startRemoteSession}>
              Start session
            </Button>
            <Button
              variant="default"
              onClick={stopRemoteSession}
              disabled={pairingStatus === 'Not connected'}
            >
              Stop session
            </Button>
          </CardFooter>
        </Card>

        {/* Present button - only when not in present mode */}
        {!isPresentMode && (
          <Button
            variant="primary"
            onClick={startPresentationMode}
            className="w-full"
          >
            Present
          </Button>
        )}
      </main>

      {/* Status / Error footer */}
      {(status || error) && (
        <footer className="mt-auto pt-2 border-t border-gray-700/50">
          <Text variant="detail" className="text-gray-500">
            {error ? `Error: ${error}` : status}
          </Text>
        </footer>
      )}
    </div>
  );
}

export default App;
