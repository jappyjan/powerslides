import * as ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import App from './app/app';
import "./styles.css";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <MemoryRouter>
    <App />
  </MemoryRouter>
);
