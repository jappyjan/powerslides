import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import "./styles.css";
import '@jappyjan/even-realities-ui/styles';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<App />);
