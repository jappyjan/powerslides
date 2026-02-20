import { SlidesContextProvider, useSlidesContext } from "../slidesContext";
import { SlideCodeInput } from "../components/slideCodeInput";
import { Log } from "../components/log";
import { SlideControlsV2 } from "../components/slideControlsV2";
import { Text } from "@jappyjan/even-realities-ui";

const DOCS_URL =
  (import.meta.env.VITE_DOCS_URL as string | undefined) ||
  "https://github.com/jappyjan/powerslides";

function AppContent() {
  const { isConnected } = useSlidesContext();

  if (!isConnected) {
    return <SlideCodeInput />;
  }

  return <SlideControlsV2 />;
}

export function App() {
  return (
    <SlidesContextProvider>
      <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6">
        <div className="flex min-h-0 flex-1 flex-col">
          <AppContent />
        </div>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block"
        >
          <Text variant="detail" className="text-gray-500 underline hover:text-gray-700">
            Docs & how to use
          </Text>
        </a>
        <Log />
      </main>
    </SlidesContextProvider>
  );
}

export default App;
