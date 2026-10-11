import '@xyflow/react/dist/style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/tokens.css';
import './ui/app.css';
import { App } from './ui/App';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Falta el elemento #root');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
