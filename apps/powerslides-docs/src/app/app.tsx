import { Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import { HomePage } from './pages/HomePage';
import { GetStartedPage } from './pages/GetStartedPage';
import { ExtensionPage } from './pages/ExtensionPage';
import { ConnectingPage } from './pages/ConnectingPage';
import { HowItWorksPage } from './pages/HowItWorksPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="get-started" element={<GetStartedPage />} />
        <Route path="extension" element={<ExtensionPage />} />
        <Route path="connecting" element={<ConnectingPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
      </Route>
    </Routes>
  );
}

export default App;
