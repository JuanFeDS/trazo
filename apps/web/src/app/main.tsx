import '@xyflow/react/dist/style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ElkLayoutEngine } from '../adapters/ElkLayoutEngine';
import { FileSystemAccessGateway } from '../adapters/FileSystemAccessGateway';
import { PngExporter } from '../adapters/export/PngExporter';
import { SvgExporter } from '../adapters/export/SvgExporter';
import { IndexedDbRepository } from '../adapters/IndexedDbRepository';
import '../ui/tokens.css';
import '../ui/app.css';
import { App } from '../ui/App';
import { ServicesProvider, type Services } from '../ui/services';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Falta el elemento #root');
}

const services: Services = {
  layoutEngine: new ElkLayoutEngine(),
  repository: new IndexedDbRepository(),
  files: new FileSystemAccessGateway(),
  exporters: { svg: new SvgExporter(), png: new PngExporter() },
};

createRoot(root).render(
  <StrictMode>
    <ServicesProvider value={services}>
      <App />
    </ServicesProvider>
  </StrictMode>,
);
