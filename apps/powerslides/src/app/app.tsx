import { SlidesContextProvider, useSlidesContext } from "../slidesContext";
import { SlideCodeInput } from "../components/slideCodeInput";
import { Log } from "../components/log";
import { SlideControlsV2 } from "../components/slideControlsV2";


function AppContent() {
  const { isConnected } = useSlidesContext();

  if (!isConnected) {
    return <SlideCodeInput />
  }

  return <SlideControlsV2 />
}

export function App() {



  return (
    <SlidesContextProvider>
      <AppContent />
      <Log />
    </SlidesContextProvider>
  );
}

export default App;
