import '@xyflow/react/dist/style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ElkLayoutEngine } from './adapters/ElkLayoutEngine';
import './ui/tokens.css';
import './ui/app.css';
import { App } from './ui/App';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Falta el elemento #root');
}

const layoutEngine = new ElkLayoutEngine();

createRoot(root).render(
  <StrictMode>
    <App layoutEngine={layoutEngine} />
  </StrictMode>,
);
